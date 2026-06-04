import { CanActivate, ExecutionContext, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { SharedFilesController } from '../src/shared-files/shared-files.controller';
import { SharedFilesService } from '../src/shared-files/shared-files.service';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AuditService } from '../src/modules/audit/audit.service';

describe('SharedFiles controller (e2e)', () => {
  let app: INestApplication;

  const currentUser = {
    userId: 'user-1',
    email: 'therapist@umbral.cl',
    role: 'THERAPIST',
    name: 'Terapeuta Test',
  };

  const sharedFilesServiceMock = {
    uploadFile: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    validateAccess: jest.fn(),
    updateFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const jwtGuardMock: CanActivate = {
    canActivate(context: ExecutionContext) {
      const requestObject = context.switchToHttp().getRequest();
      requestObject.user = currentUser;
      requestObject.correlationId = 'corr-shared-1';
      return true;
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [SharedFilesController],
      providers: [
        { provide: SharedFilesService, useValue: sharedFilesServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
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

  it('sube un archivo compartido y audita la creación', async () => {
    const tmpPath = path.join(os.tmpdir(), `shared-test-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, 'shared-file-content');

    sharedFilesServiceMock.uploadFile.mockResolvedValue({
      id: 'shared-1',
      name: 'archivo-legal.pdf',
      filename: 'shared-1.pdf',
      path: tmpPath,
    });

    await request(app.getHttpServer())
      .post('/api/v1/shared-files/upload')
      .attach('file', tmpPath)
      .expect(201)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          id: 'shared-1',
          name: 'archivo-legal.pdf',
          filename: 'shared-1.pdf',
        });
      });

    expect(sharedFilesServiceMock.uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        originalname: expect.stringContaining('shared-test-'),
      }),
      'user-1',
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        resource: 'SharedFile',
        resourceId: 'shared-1',
        statusCode: 201,
      }),
    );
  });

  it('lista archivos compartidos visibles para el usuario autenticado', async () => {
    sharedFilesServiceMock.findAll.mockResolvedValue([
      {
        id: 'shared-1',
        name: 'archivo-legal.pdf',
        filename: 'shared-1.pdf',
        mimetype: 'application/pdf',
        category: 'GENERAL',
        description: 'Documento compartido',
        createdAt: new Date('2026-06-03T12:00:00.000Z'),
      },
    ]);

    await request(app.getHttpServer())
      .get('/api/v1/shared-files')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveLength(1);
        expect(body[0]).toMatchObject({
          id: 'shared-1',
          name: 'archivo-legal.pdf',
          category: 'GENERAL',
        });
      });

    expect(sharedFilesServiceMock.findAll).toHaveBeenCalledWith(undefined, 'THERAPIST', 'user-1');
  });

  it('descarga un archivo compartido con validación de acceso y auditoría', async () => {
    const tmpPath = path.join(os.tmpdir(), `shared-download-${Date.now()}.pdf`);
    fs.writeFileSync(tmpPath, 'shared-download-content');

    sharedFilesServiceMock.validateAccess.mockResolvedValue(true);
    sharedFilesServiceMock.findOne.mockResolvedValue({
      id: 'shared-1',
      name: 'archivo-legal.pdf',
      filename: 'shared-1.pdf',
      path: tmpPath,
      uploadedById: 'user-1',
    });

    await request(app.getHttpServer())
      .get('/api/v1/shared-files/shared-1/download')
      .expect(200)
      .expect('Content-Type', /application\/pdf|application\/octet-stream/);

    expect(sharedFilesServiceMock.validateAccess).toHaveBeenCalledWith(
      'shared-1',
      'user-1',
      'THERAPIST',
    );
    expect(sharedFilesServiceMock.findOne).toHaveBeenCalledWith('shared-1');
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'VIEW',
        resource: 'SharedFile',
        resourceId: 'shared-1',
        statusCode: 200,
      }),
    );
  });
});
