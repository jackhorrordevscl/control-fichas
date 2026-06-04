import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import request from 'supertest';
import { ConsentsController } from '../src/modules/consents/consents.controller';
import { ConsentsService } from '../src/modules/consents/consents.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';

describe('Consents controller (e2e)', () => {
  let app: INestApplication;

  const currentUser = {
    userId: 'user-1',
    email: 'therapist@umbral.cl',
    role: 'THERAPIST',
    name: 'Terapeuta Test',
  };

  const consentsServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    revoke: jest.fn(),
  };

  const jwtGuardMock: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = currentUser;
      requestObject.correlationId = 'corr-test-1';
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleBuilder = Test.createTestingModule({
      controllers: [ConsentsController],
      providers: [
        { provide: ConsentsService, useValue: consentsServiceMock },
      ],
    }).overrideGuard(JwtAuthGuard).useValue(jwtGuardMock);

    const moduleFixture: TestingModule = await moduleBuilder.compile();

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

  it('registra un consentimiento con documentId y lo devuelve al cliente', async () => {
    consentsServiceMock.create.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      documentId: 'doc-1',
      type: 'INFORMED_CONSENT',
      version: 'v1',
      method: 'IN_PERSON',
      textHash: 'hash-from-document',
    });

    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/consents')
      .send({
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
        documentId: 'doc-1',
      })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toEqual({
          id: 'consent-1',
          patientId: 'patient-1',
          documentId: 'doc-1',
          type: 'INFORMED_CONSENT',
          version: 'v1',
          method: 'IN_PERSON',
          textHash: 'hash-from-document',
        });
      });

    expect(consentsServiceMock.create).toHaveBeenCalledWith(
      'patient-1',
      {
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
        documentId: 'doc-1',
      },
      'user-1',
    );
  });

  it('rechaza crear un consentimiento sin documentId', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/consents')
      .send({
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(expect.arrayContaining([expect.stringContaining('documentId')]));
      });
  });

  it('rechaza metadata adicional en la creación de consentimiento', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/consents')
      .send({
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
        documentId: 'doc-1',
        metadata: { source: 'frontend' },
      })
      .expect(400)
      .expect(({ body }) => {
        expect(body.message).toEqual(
          expect.arrayContaining([expect.stringContaining('metadata')]),
        );
      });

    expect(consentsServiceMock.create).not.toHaveBeenCalled();
  });

  it('lista consentimientos para el paciente autenticado', async () => {
    consentsServiceMock.findAll.mockResolvedValue([
      {
        id: 'consent-1',
        patientId: 'patient-1',
        documentId: 'doc-1',
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
        textHash: 'hash-from-document',
        document: {
          id: 'doc-1',
          fileName: 'consentimiento.pdf',
          type: 'INFORMED_CONSENT',
          uploadedAt: new Date('2026-06-03T10:00:00.000Z'),
          contentHash: 'hash-from-document',
        },
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/patients/patient-1/consents')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: 'consent-1',
          documentId: 'doc-1',
          document: {
            fileName: 'consentimiento.pdf',
            type: 'INFORMED_CONSENT',
            contentHash: 'hash-from-document',
          },
        });
      });

    expect(consentsServiceMock.findAll).toHaveBeenCalledWith('patient-1');
  });

  it('revoca un consentimiento con motivo', async () => {
    consentsServiceMock.revoke.mockResolvedValue({
      id: 'consent-1',
      revokedAt: new Date('2026-06-03T10:05:00.000Z'),
      reason: 'Revocación solicitada por el paciente',
    });

    await request(app.getHttpServer())
      .post('/api/v1/patients/patient-1/consents/consent-1/revoke')
      .send({ reason: 'Revocación solicitada por el paciente' })
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'consent-1',
          reason: 'Revocación solicitada por el paciente',
        });
      });

    expect(consentsServiceMock.revoke).toHaveBeenCalledWith(
      'patient-1',
      'consent-1',
      'user-1',
      'Revocación solicitada por el paciente',
    );
  });
});
