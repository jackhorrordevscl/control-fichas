import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';

function parseDate(dateStr: string): Date {
  if (dateStr.includes('T') || dateStr.includes(' ')) {
    return new Date(dateStr);
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConsultationDto, therapistId: string) {
    let patientRut = dto.patientRut ?? '';
    if (!patientRut && dto.patientId) {
      const patient = await this.prisma.patient.findUnique({
        where: { id: dto.patientId },
        select: { rut: true },
      });
      patientRut = patient?.rut ?? '';
    }
    return this.prisma.consultation.create({
      data: {
        patientId: dto.patientId,
        therapistId,
        sessionDate: parseDate(dto.sessionDate),
        consultReason: dto.consultReason,
        intervention: dto.intervention,
        agreements: dto.agreements,
        nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : null,
        sessionType: dto.sessionType ?? 'IN_PERSON',
        scheduledAt: dto.scheduledAt ? parseDate(dto.scheduledAt) : parseDate(dto.sessionDate),
        patientRut,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: { select: { name: true, email: true } },
        history: {
          orderBy: { editedAt: 'desc' },
          include: {
            editedBy: { select: { name: true, email: true } },
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        therapist: { select: { name: true, email: true } },
        history: {
          orderBy: { editedAt: 'desc' },
          include: {
            editedBy: { select: { name: true, email: true } },
          },
        },
      },
    });
    if (!consultation) throw new NotFoundException('Consulta no encontrada');
    return consultation;
  }

  async correct(id: string, dto: CorrectConsultationDto, therapistId: string) {
    const original = await this.findOne(id);

    // Snapshot del estado actual antes de modificar
    const snapshot = JSON.parse(JSON.stringify({
      sessionDate: original.sessionDate,
      consultReason: original.consultReason,
      intervention: original.intervention,
      agreements: original.agreements,
      nextSessionDate: original.nextSessionDate,
      sessionType: original.sessionType,
    }));

    return this.prisma.$transaction(async (tx) => {
      // Guardar snapshot en historial
      await tx.consultationHistory.create({
        data: {
          consultationId: id,
          editedById: therapistId,
          snapshot,
        },
      });

      // Actualizar el registro existente (no crear uno nuevo)
      return tx.consultation.update({
        where: { id },
        data: {
          sessionDate: dto.sessionDate ? parseDate(dto.sessionDate) : original.sessionDate,
          consultReason: dto.consultReason ?? original.consultReason,
          intervention: dto.intervention ?? original.intervention,
          agreements: dto.agreements ?? original.agreements,
          nextSessionDate: dto.nextSessionDate ? parseDate(dto.nextSessionDate) : original.nextSessionDate,
          sessionType: dto.sessionType ?? original.sessionType,
        },
        include: {
          therapist: { select: { name: true, email: true } },
          history: {
            orderBy: { editedAt: 'desc' },
            include: {
              editedBy: { select: { name: true, email: true } },
            },
          },
        },
      });
    });
  }
}