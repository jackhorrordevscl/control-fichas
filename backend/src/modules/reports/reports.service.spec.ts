import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const prismaMock = {
    patient: {
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
        ReportsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: PatientsService, useValue: patientsServiceMock },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('valida acceso al paciente antes de generar el PDF', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patient.findUnique.mockResolvedValue({
      id: 'patient-1',
      fullName: 'Paciente Uno',
      rut: '12345678-5',
      birthDate: new Date('1990-01-01T00:00:00.000Z'),
      occupation: null,
      phone: null,
      email: null,
      address: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      treatingPsychiatrist: null,
      treatingDoctor: null,
      consentSigned: true,
      telemedConsentSigned: true,
      consultations: [],
      therapist: { name: 'Terapeuta', email: 't@umbral.cl' },
    });

    const buffer = await service.generatePatientReport(
      'patient-1',
      'user-1',
      'THERAPIST',
    );

    expect(patientsServiceMock.findOne).toHaveBeenCalledWith(
      'patient-1',
      'user-1',
      'THERAPIST',
    );
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('rechaza generar PDF si el paciente no existe despues de validar acceso', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });
    prismaMock.patient.findUnique.mockResolvedValue(null);

    await expect(
      service.generatePatientReport('patient-1', 'user-1', 'THERAPIST'),
    ).rejects.toThrow(new NotFoundException('Paciente no encontrado'));
  });
});