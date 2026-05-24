import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { AuditService } from '../audit/audit.service';
import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

interface AuditRequestContext {
  correlationId?: string;
  ip?: string;
  userAgent?: string | string[];
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private auditService: AuditService,
  ) {}

  async login(dto: LoginDto, context?: AuditRequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.deletedAt) {
      await this.logAuthEvent({
        action: 'LOGIN_FAILED',
        resourceId: dto.email,
        detail: 'POST /api/v1/auth/login - user not found or disabled',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) {
      await this.logAuthEvent({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resourceId: user.id,
        detail: 'POST /api/v1/auth/login - invalid password',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (user.mfaEnabled) {
      return {
        requiresMfa: true,
        userId: user.id,
      };
    }

    const token = this.generateToken(user);

    await this.logAuthEvent({
      userId: user.id,
      action: 'LOGIN',
      resourceId: user.id,
      detail: 'POST /api/v1/auth/login',
      statusCode: 200,
      context,
    });

    return token;
  }

  async verifyMfa(dto: VerifyMfaDto, context?: AuditRequestContext) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user || !user.mfaSecret) {
      await this.logAuthEvent({
        action: 'MFA_FAILED',
        resourceId: dto.userId,
        detail: 'POST /api/v1/auth/mfa/verify - invalid user or missing secret',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Usuario no válido');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: dto.token,
      window: 1,
    });

    if (!isValid) {
      await this.logAuthEvent({
        userId: user.id,
        action: 'MFA_FAILED',
        resourceId: user.id,
        detail: 'POST /api/v1/auth/mfa/verify - invalid token',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Código MFA inválido');
    }

    const token = this.generateToken(user);

    await this.logAuthEvent({
      userId: user.id,
      action: 'LOGIN',
      resourceId: user.id,
      detail: 'POST /api/v1/auth/mfa/verify',
      statusCode: 200,
      context,
    });

    return token;
  }

  async generateMfaSecret(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Usuario no válido');

    const secret = speakeasy.generateSecret({
      name: `Umbral SpA (${user.email})`,
      length: 20,
    });

    // Guarda el secreto temporalmente (aún no activa MFA)
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
    };
  }

  async enableMfa(userId: string, token: string, context?: AuditRequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      await this.logAuthEvent({
        userId,
        action: 'MFA_FAILED',
        resourceId: userId,
        detail: 'POST /api/v1/auth/mfa/enable - missing secret',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Primero genera el secreto MFA');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      await this.logAuthEvent({
        userId,
        action: 'MFA_FAILED',
        resourceId: userId,
        detail: 'POST /api/v1/auth/mfa/enable - invalid token',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Código inválido, intenta de nuevo');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    return { message: 'MFA activado correctamente' };
  }

  async disableMfa(userId: string, token: string, context?: AuditRequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      await this.logAuthEvent({
        userId,
        action: 'MFA_FAILED',
        resourceId: userId,
        detail: 'POST /api/v1/auth/mfa/disable - MFA not configured',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('MFA no está configurado');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    });

    if (!isValid) {
      await this.logAuthEvent({
        userId,
        action: 'MFA_FAILED',
        resourceId: userId,
        detail: 'POST /api/v1/auth/mfa/disable - invalid token',
        statusCode: 401,
        context,
      });
      throw new UnauthorizedException('Código inválido');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: false, mfaSecret: null },
    });

    return { message: 'MFA desactivado correctamente' };
  }

  private generateToken(user: { id: string; email: string; role: string, name: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    };
  }

  private async logAuthEvent(data: {
    action: string;
    resourceId: string;
    detail: string;
    statusCode: number;
    userId?: string;
    context?: AuditRequestContext;
  }) {
    await this.auditService.log({
      userId: data.userId,
      action: data.action,
      resource: 'Auth',
      resourceId: data.resourceId,
      detail: data.detail,
      ipAddress: data.context?.ip,
      userAgent: this.getUserAgent(data.context),
      correlationId: data.context?.correlationId,
      statusCode: data.statusCode,
    }).catch(() => {});
  }

  private getUserAgent(context?: AuditRequestContext) {
    if (!context?.userAgent) {
      return undefined;
    }

    return Array.isArray(context.userAgent)
      ? context.userAgent.join(',')
      : context.userAgent;
  }
}