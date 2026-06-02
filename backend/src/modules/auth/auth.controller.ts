import { Controller, Post, Body, UseGuards, Get, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { VerifyMfaDto } from './dto/verify-mfa.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from 'src/common/interfaces/authenticated-user.interface';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { AUTH_COOKIE_NAME, CSRF_COOKIE_NAME } from './auth.constants';

type AuthRequest = Request & { correlationId?: string };

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  private getCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const sameSite: 'lax' | 'none' = isProduction ? 'none' : 'lax';

    return {
      httpOnly: true,
      sameSite,
      secure: isProduction,
      path: '/',
    };
  }

  private setAuthCookie(res: Response, accessToken: string) {
    res.cookie(AUTH_COOKIE_NAME, accessToken, this.getCookieOptions());
  }

  private setCsrfCookie(res: Response) {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const sameSite: 'lax' | 'none' = isProduction ? 'none' : 'lax';

    res.cookie(CSRF_COOKIE_NAME, randomBytes(32).toString('hex'), {
      httpOnly: false,
      sameSite,
      secure: isProduction,
      path: '/',
    });
  }

  private clearAuthCookie(res: Response) {
    res.clearCookie(AUTH_COOKIE_NAME, this.getCookieOptions());
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    if ('accessToken' in result) {
      this.setAuthCookie(res, result.accessToken);
      this.setCsrfCookie(res);
      return { user: result.user };
    }

    this.setCsrfCookie(res);

    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setCsrfCookie(res);
    return user;
  }

  @Post('mfa/verify')
  async verifyMfa(
    @Body() dto: VerifyMfaDto,
    @Req() req: AuthRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyMfa(dto, {
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    this.setAuthCookie(res, result.accessToken);
    this.setCsrfCookie(res);
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response, @Req() req: AuthRequest, @CurrentUser() user: AuthenticatedUser) {
    this.clearAuthCookie(res);
    // Log logout event explicitly
    if (this.auditService && typeof this.auditService.log === 'function') {
      this.auditService.log({
        userId: user.userId ?? (user as any).id ?? null,
        action: 'LOGOUT',
        resource: 'Auth',
        resourceId: user.userId ?? (user as any).id ?? null,
        detail: 'POST /api/v1/auth/logout',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        correlationId: req.correlationId,
        statusCode: 200,
      }).catch(() => {});
    }

    return { message: 'Sesión cerrada correctamente' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/generate')
  generateMfaSecret(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.generateMfaSecret(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  enableMfa(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string, @Req() req: AuthRequest) {
    return this.authService.enableMfa(user.userId, token, {
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  disableMfa(@CurrentUser() user: AuthenticatedUser, @Body('token') token: string, @Req() req: AuthRequest) {
    return this.authService.disableMfa(user.userId, token, {
      correlationId: req.correlationId,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
  }
}