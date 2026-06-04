import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DocumentsController } from '../src/modules/documents/documents.controller';
import { DocumentsService } from '../src/modules/documents/documents.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PatientsService } from '../src/modules/patients/patients.service';

describe('Documents controller (e2e)', () => {
  let app: INestApplication;

  const currentUser = {
    userId: 'user-1',
    email: 'therapist@umbral.cl',
    role: 'THERAPIST',
    name: 'Terapeuta Test',
  };

  const documentsServiceMock = {
    uploadDocument: jest.fn(),
    auditDocumentUpload: jest.fn(),
    findByPatient: jest.fn(),
    getDocument: jest.fn(),
    auditDocumentDownload: jest.fn(),
  };

  const patientsServiceMock = {
    findOne: jest.fn(),
  };

  const jwtGuardMock: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = currentUser;
      requestObject.correlationId = 'corr-docs-1';
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: documentsServiceMock },
        { provide: PatientsService, useValue: patientsServiceMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuardMock)
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

  it('sube un PDF de respaldo y audita la carga', async () => {
    const tmpPath = path.join(os.tmpdir(), `document-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, 'pdf-content');

    documentsServiceMock.uploadDocument.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
      type: 'INFORMED_CONSENT',
      fileName: 'consentimiento.pdf',
      storagePath: '/uploads/documents/doc-1.pdf',
    });
    documentsServiceMock.auditDocumentUpload.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .post('/api/v1/documents/upload')
      .field('patientId', 'patient-1')
      .field('type', 'INFORMED_CONSENT')
      .attach('file', tmpPath)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'doc-1',
          patientId: 'patient-1',
          type: 'INFORMED_CONSENT',
          fileName: 'consentimiento.pdf',
        });
      });

    expect(documentsServiceMock.uploadDocument).toHaveBeenCalledWith(
      'patient-1',
      'user-1',
      'THERAPIST',
      expect.objectContaining({
        originalname: expect.stringContaining('document-test-'),
      }),
      'INFORMED_CONSENT',
    );
    expect(documentsServiceMock.auditDocumentUpload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1' }),
      'user-1',
    );
  });

  it('lista documentos del paciente autenticado', async () => {
    documentsServiceMock.findByPatient.mockResolvedValue([
      {
        id: 'doc-1',
        patientId: 'patient-1',
        type: 'INFORMED_CONSENT',
        fileName: 'consentimiento.pdf',
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/documents/patient/patient-1')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: 'doc-1',
          fileName: 'consentimiento.pdf',
          type: 'INFORMED_CONSENT',
        });
      });

    expect(documentsServiceMock.findByPatient).toHaveBeenCalledWith(
      'patient-1',
      'user-1',
      'THERAPIST',
    );
  });

  it('descarga un documento con validación de acceso y auditoría', async () => {
    const tmpPath = `tmp-document-download-${Date.now()}.pdf`;
    fs.writeFileSync(tmpPath, 'download-content');

    documentsServiceMock.getDocument.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
      fileName: 'consentimiento.pdf',
      storagePath: tmpPath,
      encrypted: false,
    });
    documentsServiceMock.auditDocumentDownload.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .get('/api/v1/documents/doc-1/download')
      .expect(200)
      .expect('Content-Disposition', /attachment/);

    expect(documentsServiceMock.getDocument).toHaveBeenCalledWith(
      'doc-1',
      'user-1',
      'THERAPIST',
    );
    expect(documentsServiceMock.auditDocumentDownload).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'doc-1' }),
      'user-1',
    );
  });
});
