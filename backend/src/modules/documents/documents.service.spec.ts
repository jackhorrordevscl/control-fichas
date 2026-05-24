import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from '../patients/patients.service';
import { DocumentsService } from './documents.service';
import * as fs from 'fs';

jest.mock('../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { PrismaService } from '../../prisma/prisma.service';

jest.mock('fs', () => ({
  unlinkSync: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PatientsService, useValue: patientsServiceMock },
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