import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';
import { PatientsService } from '../patients/patients.service';
import * as fs from 'fs';

function parseDate(dateStr: string): Date {
  if (dateStr.includes('T') || dateStr.includes(' ')) {
    return new Date(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

const consultationInclude = {
  therapist: { select: { name: true, email: true } },
  history: {
    orderBy: { editedAt: 'desc' as const },
    include: {
      editedBy: { select: { name: true, email: true } },
    },
  },
  documents: {
    orderBy: { uploadedAt: 'desc' as const },
    select: {
      id: true,
      fileName: true,
      uploadedAt: true,
    },
  },
} satisfies Prisma.ConsultationInclude;

@Injectable()
export class ConsultationsService {
  constructor(
    private prisma: PrismaService,
    private patientsService: PatientsService,
  ) {}

  private async ensurePatientAccess(
    patientId: string,
    userId: string,
    userRole: string,
  ) {
    await this.patientsService.findOne(patientId, userId, userRole);
  }

  private ensureTelemedConsent(
    patient: { telemedConsentSigned: boolean },
    sessionType: string,
  ) {
    if (sessionType === 'TELEMED' && !patient.telemedConsentSigned) {
      throw new ConflictException(
        'El paciente no tiene consentimiento de telemedicina firmado',
      );
    }
  }

  private ensureClinicalConsents(
    patient: { consentSigned: boolean; telemedConsentSigned: boolean },
    sessionType: string,
  ) {
    if (!patient.consentSigned) {
      throw new ConflictException(
        'El paciente no tiene consentimiento informado firmado',
      );
    }

    this.ensureTelemedConsent(patient, sessionType);
  }

  async create(
    dto: CreateConsultationDto,
    therapistId: string,
    attachment?: Express.Multer.File,
  ) {
    let patientRut = dto.patientRut ?? '';
    const sessionType = dto.sessionType ?? 'IN_PERSON';

    try {
      if (!patientRut && dto.patientId) {
        const patient = await this.prisma.patient.findUnique({
          where: { id: dto.patientId },
          select: {
            rut: true,
            consentSigned: true,
            telemedConsentSigned: true,
          },
        });

        if (!patient) {
          throw new NotFoundException('Paciente no encontrado');
        }

        this.ensureClinicalConsents(patient, sessionType);
        patientRut = patient?.rut ?? '';
      }

      if (!attachment) {
        return this.prisma.consultation.create({
          data: {
            patientId: dto.patientId,
            therapistId,
            sessionDate: parseDate(dto.sessionDate),
            consultReason: dto.consultReason,
            intervention: dto.intervention,
            agreements: dto.agreements,
            nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : null,
            sessionType,
            scheduledAt: dto.scheduledAt ? parseDate(dto.scheduledAt) : parseDate(dto.sessionDate),
            patientRut,
            isCurrent: true,
          },
          include: consultationInclude,
        });
      }

      return await this.prisma.$transaction(async (tx) => {
        const consultation = await tx.consultation.create({
          data: {
            patientId: dto.patientId,
            therapistId,
            sessionDate: parseDate(dto.sessionDate),
            consultReason: dto.consultReason,
            intervention: dto.intervention,
            agreements: dto.agreements,
            nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : null,
            sessionType,
            scheduledAt: dto.scheduledAt ? parseDate(dto.scheduledAt) : parseDate(dto.sessionDate),
            patientRut,
            isCurrent: true,
          },
        });

        await tx.patientDocument.create({
          data: {
            patientId: dto.patientId,
            consultationId: consultation.id,
            uploadedBy: therapistId,
            type: 'CONSULTATION_ATTACHMENT',
            fileName: attachment.originalname,
            storagePath: attachment.path,
          },
        });

        return tx.consultation.findUniqueOrThrow({
          where: { id: consultation.id },
          include: consultationInclude,
        });
      });
    } catch (error) {
      if (attachment) {
        try {
          fs.unlinkSync(attachment.path);
        } catch {
          // Si el archivo ya no existe, no debe ocultar el error principal.
        }
      }

      throw error;
    }
  }

  async findByPatient(
    patientId: string,
    userId: string,
    userRole: string,
  ) {
    await this.ensurePatientAccess(patientId, userId, userRole);

    return this.prisma.consultation.findMany({
      where: {
        patientId,
        isCurrent: true,
      },
      orderBy: { createdAt: 'desc' },
      include: consultationInclude,
    });
  }

  async findOne(
    id: string,
    userId: string,
    userRole: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: consultationInclude,
    });
    if (!consultation) {
      throw new NotFoundException('Consulta no encontrada');
    }

    await this.ensurePatientAccess(
      consultation.patientId,
      userId,
      userRole,
    );
    return consultation;
  }

  async correct(
    id: string, 
    dto: CorrectConsultationDto, 
    therapistId: string,
    userRole: string,
  ) {
    const original = await this.findOne(
      id,
      therapistId,
      userRole,
    );

    if (!original.isCurrent) {
      throw new ConflictException('Esta consulta ya fue corregida. Usa la versión más reciente.');
    }

    const correctionReason = dto.reason.trim();
    if (!correctionReason) {
      throw new BadRequestException('Debes indicar el motivo de la corrección');
    }

    const snapshot = JSON.parse(JSON.stringify({
      sessionDate: original.sessionDate,
      consultReason: original.consultReason,
      intervention: original.intervention,
      agreements: original.agreements,
      nextSessionDate: original.nextSessionDate,
      sessionType: original.sessionType,
    }));
    const nextSessionType = dto.sessionType ?? original.sessionType;
    const patient = await this.prisma.patient.findUnique({
      where: { id: original.patientId },
      select: {
        consentSigned: true,
        telemedConsentSigned: true,
      },
    });

    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    this.ensureClinicalConsents(patient, nextSessionType);

    return this.prisma.$transaction(async (tx) => {
      const newConsultation = await tx.consultation.create({
        data: {
          patientId: original.patientId,
          therapistId: original.therapistId,
          sessionDate: dto.sessionDate ? parseDate(dto.sessionDate) : original.sessionDate,
          consultReason: dto.consultReason ?? original.consultReason,
          intervention: dto.intervention ?? original.intervention,
          agreements: dto.agreements ?? original.agreements,
          nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : original.nextSessionDate,
          sessionType: nextSessionType,
          scheduledAt: original.scheduledAt,
          reminderSent: original.reminderSent,
          patientRut: original.patientRut,
          isCurrent: true,
          previousVersionId: original.id,
        },
      });

      await tx.consultation.update({
        where: { id },
        data: {
          isCurrent: false,
        },
      });

      await tx.consultationHistory.createMany({
        data: [
          ...original.history.map((entry) => ({
            consultationId: newConsultation.id,
            editedById: entry.editedById,
            editedAt: entry.editedAt,
            reason: entry.reason,
            snapshot: entry.snapshot as Prisma.InputJsonValue,
          })),
          {
            consultationId: newConsultation.id,
            editedById: therapistId,
            editedAt: new Date(),
            reason: correctionReason,
            snapshot: snapshot as Prisma.InputJsonValue,
          },
        ],
      });

      return tx.consultation.findUniqueOrThrow({
        where: { id: newConsultation.id },
        include: consultationInclude,
      });
    });
  }
}