import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('argon2', () => ({
  verify: jest.fn(),
}));

jest.mock('speakeasy', () => ({
  totp: {
    verify: jest.fn(),
  },
  generateSecret: jest.fn(),
}));

jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

import * as argon2 from 'argon2';
import * as speakeasy from 'speakeasy';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const jwtServiceMock = {
    sign: jest.fn().mockReturnValue('signed-jwt'),
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('audita LOGIN_FAILED cuando el usuario no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login(
        { email: 'missing@umbral.cl', password: '12345678' },
        { correlationId: 'corr-1', ip: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: undefined,
        action: 'LOGIN_FAILED',
        resource: 'Auth',
        resourceId: 'missing@umbral.cl',
        statusCode: 401,
        correlationId: 'corr-1',
      }),
    );
  });

  it('audita LOGIN_FAILED cuando la contraseña es inválida', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      passwordHash: 'hash',
      deletedAt: null,
    });
    (argon2.verify as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login(
        { email: 'user@umbral.cl', password: 'wrongpass' },
        { correlationId: 'corr-2', ip: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toThrow(new UnauthorizedException('Credenciales inválidas'));

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'LOGIN_FAILED',
        resourceId: 'user-1',
        statusCode: 401,
      }),
    );
  });

  it('audita LOGIN cuando el login es exitoso', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      passwordHash: 'hash',
      deletedAt: null,
      mfaEnabled: false,
      role: 'THERAPIST',
      name: 'Usuario Uno',
    });
    (argon2.verify as jest.Mock).mockResolvedValue(true);

    const result = await service.login(
      { email: 'user@umbral.cl', password: 'correctpass' },
      { correlationId: 'corr-3', ip: '127.0.0.1', userAgent: 'jest' },
    );

    expect(jwtServiceMock.sign).toHaveBeenCalled();
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'LOGIN',
        resourceId: 'user-1',
        statusCode: 200,
      }),
    );
    expect(result).toEqual({
      accessToken: 'signed-jwt',
      user: {
        id: 'user-1',
        email: 'user@umbral.cl',
        role: 'THERAPIST',
        name: 'Usuario Uno',
      },
    });
  });

  it('audita MFA_FAILED cuando el token MFA es inválido', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'user@umbral.cl',
      mfaSecret: 'secret',
      role: 'THERAPIST',
      name: 'Usuario Uno',
    });
    (speakeasy.totp.verify as jest.Mock).mockReturnValue(false);

    await expect(
      service.verifyMfa(
        { userId: 'user-1', token: '000000' },
        { correlationId: 'corr-4', ip: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toThrow(new UnauthorizedException('Código MFA inválido'));

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        action: 'MFA_FAILED',
        resourceId: 'user-1',
        statusCode: 401,
      }),
    );
  });
});