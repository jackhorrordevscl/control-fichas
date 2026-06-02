import { Test, TestingModule } from '@nestjs/testing';
import { ConsentsService } from '../src/modules/consents/consents.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('Consents E2E (mocked Prisma)', () => {
  let service: ConsentsService;

  const prismaMock = {
    patient: { findUnique: jest.fn() },
    consent: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  } as any;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  it('crea un consentimiento si el paciente existe', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({ id: 'p1' });
    prismaMock.consent.create.mockResolvedValue({ id: 'c1', patientId: 'p1' });

    const dto = { type: 'INFORMED_CONSENT', version: 'v1' };
    const created = await service.create('p1', dto, 'user-1');

    expect(prismaMock.patient.findUnique).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(prismaMock.consent.create).toHaveBeenCalled();
    expect(created).toEqual({ id: 'c1', patientId: 'p1' });
  });

  it('lanza NotFound si el paciente no existe', async () => {
    prismaMock.patient.findUnique.mockResolvedValue(null);

    await expect(service.create('nope', { type: 'OTHER' }, 'user-1')).rejects.toThrow(NotFoundException);
  });

  it('revoca un consentimiento existente', async () => {
    prismaMock.consent.findUnique.mockResolvedValue({ id: 'c1', patientId: 'p1' });
    prismaMock.consent.update.mockResolvedValue({ id: 'c1', revokedAt: new Date() });

    const updated = await service.revoke('p1', 'c1', 'user-2', 'reason');

    expect(prismaMock.consent.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
    expect(prismaMock.consent.update).toHaveBeenCalled();
    expect(updated).toHaveProperty('id', 'c1');
  });
});
