import { Test, TestingModule } from '@nestjs/testing';
import {
  Controller,
  Get,
  INestApplication,
  Param,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './../src/modules/auth/auth.controller';
import { AuthService } from './../src/modules/auth/auth.service';
import { JwtStrategy } from './../src/modules/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from './../src/common/guards/jwt-auth.guard';
import { PrismaService } from './../src/prisma/prisma.service';
import { AuditService } from './../src/modules/audit/audit.service';
import { AuditInterceptor } from './../src/common/interceptors/audit.interceptor';
import { ConsultationsController } from './../src/modules/consultations/consultations.controller';
import { ConsultationsService } from './../src/modules/consultations/consultations.service';

@Controller('reports')
class ReportsTestController {
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getReport(@Param('id') id: string) {
    return { id, ok: true };
  }
}

describe('Auth session and audit (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const testUser = {
    id: 'user-1',
    email: 'user@umbral.cl',
    role: 'ADMIN',
    name: 'Admin Umbral',
  };

  const authenticatedUser = {
    userId: testUser.id,
    email: testUser.email,
    role: testUser.role,
    name: testUser.name,
  };

  const prismaMock = {
    user: {
      findUnique: jest.fn().mockResolvedValue(testUser),
    },
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const configServiceMock = {
    get: jest.fn((key: string, defaultValue?: string) => {
      if (key === 'JWT_SECRET') {
        return 'test-secret';
      }

      if (key === 'JWT_EXPIRES_IN') {
        return '1h';
      }

      if (key === 'NODE_ENV') {
        return 'test';
      }

      return defaultValue;
    }),
  };

  const authServiceMock = {
    login: jest.fn(),
    verifyMfa: jest.fn(),
    generateMfaSecret: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
  };

  const consultationsServiceMock = {
    create: jest.fn(),
    findByPatient: jest.fn(),
    findOne: jest.fn(),
    correct: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        PassportModule,
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [
        AuthController,
        ReportsTestController,
        ConsultationsController,
      ],
      providers: [
        JwtStrategy,
        {
          provide: APP_INTERCEPTOR,
          useClass: AuditInterceptor,
        },
        {
          provide: AuthService,
          useValue: authServiceMock,
        },
        {
          provide: ConsultationsService,
          useValue: consultationsServiceMock,
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: AuditService,
          useValue: auditServiceMock,
        },
        {
          provide: ConfigService,
          useValue: configServiceMock,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    jwtService = moduleFixture.get(JwtService);

    authServiceMock.login.mockResolvedValue({
      accessToken: jwtService.sign({
        sub: testUser.id,
        email: testUser.email,
        role: testUser.role,
      }),
      user: testUser,
    });

    consultationsServiceMock.correct.mockResolvedValue({
      id: 'consult-2',
      previousVersionId: 'consult-1',
      isCurrent: true,
      history: [
        {
          reason: 'Ajuste clínico',
        },
      ],
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('mantiene la sesión con cookie httpOnly y permite recuperar /auth/me', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: '12345678',
      })
      .expect(201)
      .expect(({ headers, body }) => {
        expect(headers['set-cookie']).toEqual(
          expect.arrayContaining([
            expect.stringContaining('umbral_access_token='),
          ]),
        );
        expect(body).toEqual({ user: testUser });
      });

    await agent
      .get('/api/v1/auth/me')
      .expect(200)
      .expect(authenticatedUser);
  });

  it('audita el acceso a un endpoint protegido tras autenticación por cookie', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: '12345678',
      })
      .expect(201);

    await agent
      .get('/api/v1/reports/report-123')
      .expect(200)
      .expect({ id: 'report-123', ok: true });

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUser.id,
        action: 'EXPORT_PDF',
        resource: 'Report',
        resourceId: 'report-123',
        detail: 'GET /api/v1/reports/report-123',
        statusCode: 200,
      }),
    );
  });

  it('rechaza una corrección de consulta sin motivo y no invoca el servicio', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: '12345678',
      })
      .expect(201);

    await agent
      .patch('/api/v1/consultations/consult-1/correct')
      .send({
        consultReason: 'Seguimiento',
      })
      .expect(400);

    expect(consultationsServiceMock.correct).not.toHaveBeenCalled();
  });

  it('corrige una consulta autenticada con motivo obligatorio y registra auditoría', async () => {
    const agent = request.agent(app.getHttpServer());

    await agent
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: '12345678',
      })
      .expect(201);

    await agent
      .patch('/api/v1/consultations/consult-1/correct')
      .send({
        reason: 'Ajuste clínico',
        consultReason: 'Seguimiento actualizado',
      })
      .expect(200)
      .expect({
        id: 'consult-2',
        previousVersionId: 'consult-1',
        isCurrent: true,
        history: [
          {
            reason: 'Ajuste clínico',
          },
        ],
      });

    expect(consultationsServiceMock.correct).toHaveBeenCalledWith(
      'consult-1',
      {
        reason: 'Ajuste clínico',
        consultReason: 'Seguimiento actualizado',
      },
      testUser.id,
      testUser.role,
    );

    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: testUser.id,
        action: 'UPDATE',
        resource: 'Consultation',
        resourceId: 'consult-1',
        detail: 'PATCH /api/v1/consultations/consult-1/correct',
        statusCode: 200,
      }),
    );
  });
});
