import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from '../patients/patients.service';
import { DocumentsService } from './documents.service';
import { AuditService } from '../audit/audit.service';
import * as fs from 'fs';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../prisma/prisma.service';

jest.mock('fs', () => ({
  unlinkSync: jest.fn(),
  readFileSync: jest.fn((path: string) => Buffer.from('dummy')),
  writeFileSync: jest.fn(),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;

  const prismaMock = {
    patientDocument: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const patientsServiceMock = {
    findOne: jest.fn(),
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PatientsService, useValue: patientsServiceMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  it('rechaza upload si el usuario no puede acceder al paciente y elimina el archivo temporal', async () => {
    patientsServiceMock.findOne.mockRejectedValue(
      new ForbiddenException('Acceso denegado a este paciente'),
    );

    await expect(
      service.uploadDocument(
        'patient-1',
        'user-1',
        'THERAPIST',
        { path: '/tmp/file.pdf', originalname: 'file.pdf' } as Express.Multer.File,
        'INFORMED_CONSENT',
      ),
    ).rejects.toThrow(new ForbiddenException('Acceso denegado a este paciente'));

    expect(fs.unlinkSync).toHaveBeenCalledWith('/tmp/file.pdf');
    expect(prismaMock.patientDocument.create).not.toHaveBeenCalled();
  });

  it('cifra el archivo cuando FILE_ENCRYPTION_KEY está presente y guarda metadatos', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patientDocument.create.mockResolvedValue({ id: 'doc-enc' });

    process.env.FILE_ENCRYPTION_KEY = Buffer.from('0'.repeat(32)).toString('base64');

    await service.uploadDocument(
      'patient-1',
      'user-1',
      'THERAPIST',
      { path: '/tmp/file.pdf', originalname: 'file.pdf', mimetype: 'application/pdf' } as Express.Multer.File,
      'INFORMED_CONSENT',
    );

    expect(prismaMock.patientDocument.create).toHaveBeenCalled();
    const callArg = prismaMock.patientDocument.create.mock.calls[0][0].data;
    expect(callArg.encrypted).toBe(true);
    expect(callArg.encDataKey).toBeDefined();
    expect(callArg.iv).toBeDefined();
  });

  it('rechaza documentos clínicos si no hay cifrado configurado', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });

    delete process.env.FILE_ENCRYPTION_KEY;
    delete process.env.KMS_KEY_ID;

    await expect(
      service.uploadDocument(
        'patient-1',
        'user-1',
        'THERAPIST',
        { path: '/tmp/file.pdf', originalname: 'file.pdf', mimetype: 'application/pdf', size: 123 } as Express.Multer.File,
        'INFORMED_CONSENT',
      ),
    ).rejects.toThrow('Los documentos clínicos requieren cifrado configurado antes de subirlos');
  });

  it('rechaza tipos de documento inválidos', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });

    await expect(
      service.uploadDocument(
        'patient-1',
        'user-1',
        'THERAPIST',
        { path: '/tmp/file.pdf', originalname: 'file.pdf', mimetype: 'application/pdf', size: 123 } as Express.Multer.File,
        'NOT_A_TYPE',
      ),
    ).rejects.toThrow('Tipo de documento inválido');
  });

  it('lista documentos solo tras validar acceso al paciente', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patientDocument.findMany.mockResolvedValue([{ id: 'doc-1' }]);

    await expect(
      service.findByPatient('patient-1', 'user-1', 'THERAPIST'),
    ).resolves.toEqual([{ id: 'doc-1' }]);

    expect(patientsServiceMock.findOne).toHaveBeenCalledWith(
      'patient-1',
      'user-1',
      'THERAPIST',
    );
  });

  it('rechaza descarga de documento inexistente', async () => {
    prismaMock.patientDocument.findUnique.mockResolvedValue(null);

    await expect(
      service.getDocument('doc-404', 'user-1', 'THERAPIST'),
    ).rejects.toThrow(new NotFoundException('Documento no encontrado'));
  });

  it('valida acceso del documento a traves del paciente asociado', async () => {
    prismaMock.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
    });
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });

    await expect(
      service.getDocument('doc-1', 'user-1', 'THERAPIST'),
    ).resolves.toEqual({
      id: 'doc-1',
      patientId: 'patient-1',
    });

    expect(patientsServiceMock.findOne).toHaveBeenCalledWith(
      'patient-1',
      'user-1',
      'THERAPIST',
    );
  });
});