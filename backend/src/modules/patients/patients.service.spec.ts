import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsService } from './patients.service';

describe('PatientsService', () => {
  let service: PatientsService;

  const prismaMock = {
    patient: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    patientHistory: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
  });

  it('aplica busqueda backend por RUT y restringe terapeutas a sus propios pacientes', async () => {
    prismaMock.patient.findMany.mockResolvedValue([]);

    await service.findAll('therapist-1', Role.THERAPIST, '445272469');

    expect(prismaMock.patient.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        therapistId: 'therapist-1',
        OR: [
          { fullName: { contains: '445272469', mode: 'insensitive' } },
          { rut: { contains: '445272469' } },
          { rut: { contains: '44527246-9' } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('permite a admin listar pacientes sin restriccion por therapistId', async () => {
    prismaMock.patient.findMany.mockResolvedValue([]);

    await service.findAll('admin-1', Role.ADMIN, 'Ana');

    expect(prismaMock.patient.findMany).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        OR: [
          { fullName: { contains: 'Ana', mode: 'insensitive' } },
          { rut: { contains: 'ANA' } },
          { rut: { contains: 'AN-A' } },
        ],
      },
      include: { therapist: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('rechaza que coordinator vea pacientes de otro terapeuta', async () => {
    prismaMock.patient.findFirst.mockResolvedValue({
      id: 'patient-1',
      therapistId: 'therapist-2',
      therapist: { id: 'therapist-2', name: 'Otra Persona' },
      consultations: [],
      documents: [],
    });

    await expect(
      service.findOne('patient-1', 'coordinator-1', Role.COORDINATOR),
    ).rejects.toThrow(
      new ForbiddenException(
        'Como Coordinador solo puedes ver la ficha clínica de tus propios pacientes',
      ),
    );
  });

  it('permite a admin ver un paciente de cualquier terapeuta', async () => {
    const patient = {
      id: 'patient-1',
      therapistId: 'therapist-2',
      therapist: { id: 'therapist-2', name: 'Otra Persona' },
      consultations: [],
      documents: [],
    };
    prismaMock.patient.findFirst.mockResolvedValue(patient);

    await expect(
      service.findOne('patient-1', 'admin-1', Role.ADMIN),
    ).resolves.toEqual(patient);
  });
});