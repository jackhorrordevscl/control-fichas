import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentsService } from './consents.service';

describe('ConsentsService', () => {
  let service: ConsentsService;

  const prismaMock = {
    patient: {
      findUnique: jest.fn(),
    },
    patientDocument: {
      findUnique: jest.fn(),
    },
    consent: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AuditService, useValue: auditServiceMock },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  it('registra un consentimiento y lo audita', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
      contentHash: 'hash-123',
      fileName: 'consentimiento.pdf',
    });
    prismaMock.consent.findFirst.mockResolvedValue(null);
    prismaMock.consent.create.mockResolvedValue({ id: 'consent-1' });

    const result = await service.create(
      'patient-1',
      {
        type: 'INFORMED_CONSENT',
        version: 'v1',
        method: 'IN_PERSON',
        documentId: 'doc-1',
      },
      'user-1',
    );

    expect(prismaMock.consent.create).toHaveBeenCalledWith({
      data: {
        patientId: 'patient-1',
        type: 'INFORMED_CONSENT',
        version: 'v1',
        textHash: 'hash-123',
        method: 'IN_PERSON',
        documentId: 'doc-1',
        grantedBy: 'user-1',
      },
    });
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONSENT_CREATED',
        resource: 'Consent',
        resourceId: 'consent-1',
        statusCode: 201,
      }),
    );
    expect(result).toEqual({ id: 'consent-1' });
  });

  it('genera el hash desde el documento vinculado', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
      contentHash: 'hash-from-document',
      fileName: 'consentimiento.pdf',
    });
    prismaMock.consent.findFirst.mockResolvedValue(null);
    prismaMock.consent.create.mockResolvedValue({ id: 'consent-2' });

    await service.create(
      'patient-1',
      {
        type: 'INFORMED_CONSENT',
        version: 'v2',
        method: 'ELECTRONIC',
        documentId: 'doc-1',
      },
      'user-1',
    );

    expect(prismaMock.consent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          documentId: 'doc-1',
          textHash: 'hash-from-document',
        }),
      }),
    );
  });

  it('rechaza consentimientos sin documento de respaldo', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });

    await expect(
      service.create(
        'patient-1',
        {
          type: 'INFORMED_CONSENT',
          version: 'v1',
          method: 'IN_PERSON',
        },
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('bloquea consentimientos vigentes duplicados', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patientDocument.findUnique.mockResolvedValue({
      id: 'doc-1',
      patientId: 'patient-1',
      contentHash: 'hash-123',
      fileName: 'consentimiento.pdf',
    });
    prismaMock.consent.findFirst.mockResolvedValue({ id: 'consent-1' });

    await expect(
      service.create(
        'patient-1',
        {
          type: 'INFORMED_CONSENT',
          version: 'v1',
          method: 'IN_PERSON',
          documentId: 'doc-1',
        },
        'user-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('revoca un consentimiento con motivo y lo audita', async () => {
    prismaMock.consent.findUnique.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      type: 'INFORMED_CONSENT',
      revokedAt: null,
    });
    prismaMock.consent.update.mockResolvedValue({ id: 'consent-1', revokedAt: new Date() });

    const result = await service.revoke(
      'patient-1',
      'consent-1',
      'user-1',
      'Revocación solicitada por el paciente',
    );

    expect(prismaMock.consent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'consent-1' },
        data: expect.objectContaining({
          revokedBy: 'user-1',
          reason: 'Revocación solicitada por el paciente',
        }),
      }),
    );
    expect(auditServiceMock.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONSENT_REVOKED',
        resource: 'Consent',
        resourceId: 'consent-1',
        statusCode: 200,
      }),
    );
    expect(result).toMatchObject({
      id: 'consent-1',
    });
  });

  it('rechaza revocar un consentimiento sin motivo', async () => {
    prismaMock.consent.findUnique.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-1',
      type: 'INFORMED_CONSENT',
      revokedAt: null,
    });

    await expect(
      service.revoke('patient-1', 'consent-1', 'user-1', ''),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza revocar consentimientos de otro paciente', async () => {
    prismaMock.consent.findUnique.mockResolvedValue({
      id: 'consent-1',
      patientId: 'patient-2',
      type: 'INFORMED_CONSENT',
      revokedAt: null,
    });

    await expect(
      service.revoke('patient-1', 'consent-1', 'user-1', 'Motivo'),
    ).rejects.toThrow(NotFoundException);
  });
});