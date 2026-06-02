import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DataSubjectRequestsService } from './data-subject-requests.service';

describe('DataSubjectRequestsService', () => {
  let service: DataSubjectRequestsService;

  const prismaMock = {
    patient: {
      findUnique: jest.fn(),
    },
    dataSubjectRequest: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataSubjectRequestsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<DataSubjectRequestsService>(DataSubjectRequestsService);
  });

  it('registra una solicitud del titular y la audita', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    prismaMock.dataSubjectRequest.create.mockResolvedValue({ id: 'request-1' });

    const result = await service.create('patient-1', {
      type: 'ACCESS',
      details: 'Solicita copia de su ficha',
      evidence: { source: 'frontend' },
    }, 'user-1');

    expect(prismaMock.dataSubjectRequest.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        type: 'ACCESS',
        details: 'Solicita copia de su ficha',
        evidence: { source: 'frontend' },
        requestedBy: 'user-1',
      },
    });
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        resource: 'DataSubjectRequest',
        resourceId: 'request-1',
        statusCode: 201,
      }),
    );
    expect(result).toEqual({ id: 'request-1' });
  });

  it('rechaza solicitudes sin tipo', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });

    await expect(
      service.create('patient-1', {}, 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('resuelve una solicitud pendiente y la audita', async () => {
    prismaMock.dataSubjectRequest.findUnique.mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-1',
      type: 'ACCESS',
      status: 'PENDING',
    });
    prismaMock.dataSubjectRequest.update.mockResolvedValue({ id: 'request-1', status: 'RESOLVED' });

    const result = await service.resolve('patient-1', 'request-1', 'Se entregó la copia solicitada', 'user-1');

    expect(prismaMock.dataSubjectRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'request-1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          resolutionNote: 'Se entregó la copia solicitada',
        }),
      }),
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATE',
        resource: 'DataSubjectRequest',
        resourceId: 'request-1',
        statusCode: 200,
      }),
    );
    expect(result).toEqual({ id: 'request-1', status: 'RESOLVED' });
  });

  it('rechaza resolver solicitudes ajenas', async () => {
    prismaMock.dataSubjectRequest.findUnique.mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-2',
      type: 'ACCESS',
      status: 'PENDING',
    });

    await expect(
      service.resolve('patient-1', 'request-1', 'Motivo', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('rechaza resolver solicitudes ya cerradas', async () => {
    prismaMock.dataSubjectRequest.findUnique.mockResolvedValue({
      id: 'request-1',
      patientId: 'patient-1',
      type: 'ACCESS',
      status: 'RESOLVED',
    });

    await expect(
      service.resolve('patient-1', 'request-1', 'Motivo', 'user-1'),
    ).rejects.toThrow(ConflictException);
  });
});
