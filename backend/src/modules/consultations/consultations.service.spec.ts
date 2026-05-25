import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { ConsultationsService } from './consultations.service';

describe('ConsultationsService', () => {
  let service: ConsultationsService;

  const prismaMock = {
    patient: {
      findUnique: jest.fn(),
    },
    consultation: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    patientDocument: {
      create: jest.fn(),
    },
    consultationHistory: {
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const patientsServiceMock = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultationsService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
        {
          provide: PatientsService,
          useValue: patientsServiceMock,
        },
      ],
    }).compile();

    service = module.get<ConsultationsService>(ConsultationsService);
  });

  it('rechaza crear una consulta si falta consentimiento informado', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      rut: '12345678-5',
      consentSigned: false,
      telemedConsentSigned: true,
    });

    await expect(
      service.create(
        {
          patientId: 'patient-1',
          sessionDate: '2026-05-24T10:00:00.000Z',
          consultReason: 'Ansiedad',
          intervention: 'Psicoeducacion',
          sessionType: 'IN_PERSON',
        },
        'therapist-1',
      ),
    ).rejects.toThrow(
      new ConflictException('El paciente no tiene consentimiento informado firmado'),
    );

    expect(prismaMock.consultation.create).not.toHaveBeenCalled();
  });

  it('rechaza crear una consulta telemed si falta consentimiento de telemedicina', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      rut: '12345678-5',
      consentSigned: true,
      telemedConsentSigned: false,
    });

    await expect(
      service.create(
        {
          patientId: 'patient-1',
          sessionDate: '2026-05-24T10:00:00.000Z',
          consultReason: 'Ansiedad',
          intervention: 'Psicoeducacion',
          sessionType: 'TELEMED',
        },
        'therapist-1',
      ),
    ).rejects.toThrow(
      new ConflictException(
        'El paciente no tiene consentimiento de telemedicina firmado',
      ),
    );

    expect(prismaMock.consultation.create).not.toHaveBeenCalled();
  });

  it('crea una consulta con adjunto PDF asociado a la consulta', async () => {
    prismaMock.patient.findUnique.mockResolvedValue({
      rut: '12345678-5',
      consentSigned: true,
      telemedConsentSigned: true,
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock as typeof prismaMock),
    );
    prismaMock.consultation.create.mockResolvedValue({ id: 'consultation-1' });
    prismaMock.consultation.findUniqueOrThrow.mockResolvedValue({
      id: 'consultation-1',
      documents: [{ id: 'doc-1', fileName: 'informe.pdf' }],
      history: [],
    });

    await expect(
      service.create(
        {
          patientId: 'patient-1',
          sessionDate: '2026-05-24T10:00:00.000Z',
          consultReason: 'Ansiedad',
          intervention: 'Psicoeducacion',
          sessionType: 'IN_PERSON',
        },
        'therapist-1',
        {
          originalname: 'informe.pdf',
          path: '/tmp/informe.pdf',
        } as Express.Multer.File,
      ),
    ).resolves.toEqual({
      id: 'consultation-1',
      documents: [{ id: 'doc-1', fileName: 'informe.pdf' }],
      history: [],
    });

    expect(prismaMock.patientDocument.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        patientId: 'patient-1',
        consultationId: 'consultation-1',
        uploadedBy: 'therapist-1',
        type: 'CONSULTATION_ATTACHMENT',
        fileName: 'informe.pdf',
        storagePath: '/tmp/informe.pdf',
      }),
    });
  });

  it('lista consultas existentes aunque falte la migración de adjuntos en el entorno', async () => {
    patientsServiceMock.findOne.mockResolvedValue({ id: 'patient-1' });
    prismaMock.consultation.findMany
      .mockRejectedValueOnce({
        code: 'P2022',
        message: 'The column `PatientDocument.consultationId` does not exist',
      } as Prisma.PrismaClientKnownRequestError)
      .mockResolvedValueOnce([
        {
          id: 'consultation-1',
          consultReason: 'Seguimiento',
          history: [],
          therapist: { name: 'Terapeuta', email: 'tera@umbral.cl' },
        },
      ]);

    await expect(
      service.findByPatient('patient-1', 'user-1', 'THERAPIST'),
    ).resolves.toEqual([
      {
        id: 'consultation-1',
        consultReason: 'Seguimiento',
        history: [],
        therapist: { name: 'Terapeuta', email: 'tera@umbral.cl' },
        documents: [],
      },
    ]);
  });

  it('crea una nueva version vigente al corregir una consulta', async () => {
    const originalConsultation = {
      id: 'consultation-1',
      patientId: 'patient-1',
      therapistId: 'therapist-1',
      sessionDate: new Date('2026-05-20T10:00:00.000Z'),
      consultReason: 'Ansiedad',
      intervention: 'Psicoeducacion',
      agreements: 'Respiracion',
      nextSessionDate: new Date('2026-05-27T10:00:00.000Z'),
      sessionType: 'IN_PERSON',
      scheduledAt: new Date('2026-05-20T10:00:00.000Z'),
      reminderSent: false,
      patientRut: '12345678-5',
      isCurrent: true,
      history: [
        {
          editedById: 'therapist-1',
          editedAt: new Date('2026-05-20T11:00:00.000Z'),
          reason: 'Corrección previa',
          snapshot: { consultReason: 'Inicio' },
        },
      ],
    };
    const correctedConsultation = {
      id: 'consultation-2',
      history: [],
    };

    jest.spyOn(service, 'findOne').mockResolvedValue(originalConsultation as never);
    prismaMock.patient.findUnique.mockResolvedValue({
      consentSigned: true,
      telemedConsentSigned: true,
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => unknown) =>
      callback(prismaMock as typeof prismaMock),
    );
    prismaMock.consultation.create.mockResolvedValue(correctedConsultation);
    prismaMock.consultation.findUniqueOrThrow.mockResolvedValue({
      ...correctedConsultation,
      history: [{ snapshot: { consultReason: 'Ansiedad' } }],
    });

    const result = await service.correct(
      'consultation-1',
      {
        reason: 'Corrección clínica por precisión de registro',
        consultReason: 'Ansiedad actualizada',
      },
      'therapist-1',
      'THERAPIST',
    );

    expect(prismaMock.consultation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          previousVersionId: 'consultation-1',
          isCurrent: true,
          consultReason: 'Ansiedad actualizada',
        }),
      }),
    );
    expect(prismaMock.consultation.update).toHaveBeenCalledWith({
      where: { id: 'consultation-1' },
      data: {
        isCurrent: false,
      },
    });
    expect(prismaMock.consultationHistory.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            consultationId: 'consultation-2',
            reason: 'Corrección clínica por precisión de registro',
          }),
        ]),
      }),
    );
    expect(result).toEqual({
      ...correctedConsultation,
      history: [{ snapshot: { consultReason: 'Ansiedad' } }],
    });
  });

  it('rechaza corregir una consulta historica', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'consultation-1',
      isCurrent: false,
      history: [],
    } as never);

    await expect(
      service.correct(
        'consultation-1',
        {
          reason: 'Ajuste',
          consultReason: 'Cambio',
        },
        'therapist-1',
        'THERAPIST',
      ),
    ).rejects.toThrow(
      new ConflictException(
        'Esta consulta ya fue corregida. Usa la versión más reciente.',
      ),
    );

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('rechaza corregir una consulta sin motivo válido', async () => {
    jest.spyOn(service, 'findOne').mockResolvedValue({
      id: 'consultation-1',
      isCurrent: true,
      sessionDate: new Date('2026-05-20T10:00:00.000Z'),
      consultReason: 'Ansiedad',
      intervention: 'Psicoeducacion',
      agreements: 'Respiracion',
      nextSessionDate: null,
      sessionType: 'IN_PERSON',
      patientId: 'patient-1',
      therapistId: 'therapist-1',
      scheduledAt: new Date('2026-05-20T10:00:00.000Z'),
      reminderSent: false,
      patientRut: '12345678-5',
      history: [],
    } as never);

    await expect(
      service.correct(
        'consultation-1',
        {
          reason: '   ',
          consultReason: 'Cambio',
        },
        'therapist-1',
        'THERAPIST',
      ),
    ).rejects.toThrow(
      new BadRequestException('Debes indicar el motivo de la corrección'),
    );

    expect(prismaMock.patient.findUnique).not.toHaveBeenCalled();
  });
});