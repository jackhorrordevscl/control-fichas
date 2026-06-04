import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { DataSubjectRequestsController } from '../src/modules/data-subject-requests/data-subject-requests.controller';
import { DataSubjectRequestsService } from '../src/modules/data-subject-requests/data-subject-requests.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';

describe('DataSubjectRequests controller (e2e)', () => {
  let app: INestApplication;

  const currentUser = {
    userId: 'user-1',
    email: 'coordinator@umbral.cl',
    role: 'COORDINATOR',
    name: 'Coordinador Test',
  };

  const dataSubjectRequestsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    resolve: jest.fn(),
  };

  const authGuardMock: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = currentUser;
      requestObject.correlationId = 'corr-dsr-1';
      return true;
    },
  };

  const rolesGuardMock: CanActivate = {
    canActivate() {
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DataSubjectRequestsController],
      providers: [
        { provide: DataSubjectRequestsService, useValue: dataSubjectRequestsServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuardMock)
      .overrideGuard(RolesGuard)
      .useValue(rolesGuardMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new (require('@nestjs/common').ValidationPipe)({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('registra una solicitud del titular con evidencia y la devuelve al cliente', async () => {
    dataSubjectRequestsServiceMock.create.mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-1',
      type: 'ACCESS',
      details: 'Solicita copia de su ficha',
      evidence: { source: 'frontend' },
    });

    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/data-subject-requests')
      .send({
        type: 'ACCESS',
        details: 'Solicita copia de su ficha',
        evidence: { source: 'frontend' },
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 'request-1',
          patientId: 'patient-1',
          type: 'ACCESS',
          details: 'Solicita copia de su ficha',
          evidence: { source: 'frontend' },
        });
      });

    expect(dataSubjectRequestsServiceMock.create).toHaveBeenCalledWith(
      'patient-1',
      {
        type: 'ACCESS',
        details: 'Solicita copia de su ficha',
        evidence: { source: 'frontend' },
      },
      'user-1',
    );
  });

  it('rechaza solicitudes del titular sin tipo', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/data-subject-requests')
      .send({
        details: 'Falta el tipo',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(expect.arrayContaining([expect.stringContaining('type')]));
      });

    expect(dataSubjectRequestsServiceMock.create).not.toHaveBeenCalled();
  });

  it('lista solicitudes del titular para el paciente autenticado', async () => {
    dataSubjectRequestsServiceMock.findAll.mockResolvedValue([
      {
        id: 'request-1',
        patientId: 'patient-1',
        type: 'ACCESS',
        status: 'PENDING',
        details: 'Solicita copia de su ficha',
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/patients/patient-1/data-subject-requests')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: 'request-1',
          status: 'PENDING',
          type: 'ACCESS',
        });
      });

    expect(dataSubjectRequestsServiceMock.findAll).toHaveBeenCalledWith('patient-1');
  });

  it('resuelve una solicitud del titular con nota', async () => {
    dataSubjectRequestsServiceMock.resolve.mockResolvedValue({
      id: 'request-1',
      status: 'RESOLVED',
      resolutionNote: 'Se entregó la copia solicitada',
    });

    await request(app.getHttpServer())
      .patch('/api/v1/patients/patient-1/data-subject-requests/request-1/resolve')
      .send({
        resolutionNote: 'Se entregó la copia solicitada',
      })
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'request-1',
          status: 'RESOLVED',
          resolutionNote: 'Se entregó la copia solicitada',
        });
      });

    expect(dataSubjectRequestsServiceMock.resolve).toHaveBeenCalledWith(
      'patient-1',
      'request-1',
      'Se entregó la copia solicitada',
      'user-1',
    );
  });
});