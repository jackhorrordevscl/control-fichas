import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CorrectConsultationDto } from './dto/correct-consultation.dto';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConsultationDto, therapistId: string) {
    return this.prisma.consultation.create({
      data: {
        patientId: dto.patientId,
        therapistId,
        sessionDate: new Date(dto.sessionDate),
        consultReason: dto.consultReason,
        intervention: dto.intervention,
        agreements: dto.agreements,
        nextSessionDate: dto.nextSessionDate
          ? new Date(dto.nextSessionDate)
          : null,
        sessionType: dto.sessionType ?? 'IN_PERSON',
        version: 1,
      },
    });
  }

  async findByPatient(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        therapist: {
          select: { name: true, email: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: {
        therapist: {
          select: { name: true, email: true },
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consulta no encontrada');
    }

    return consultation;
  }

  // Corrección legal: no edita, crea nueva versión vinculada a la original
  async correct(id: string, dto: CorrectConsultationDto, therapistId: string) {
    const original = await this.findOne(id);

    // Marca la original como corregida
    await this.prisma.consultation.update({
      where: { id },
      data: { isCorrected: true },
    });

    // Crea nueva versión con los datos corregidos
    return this.prisma.consultation.create({
      data: {
        patientId: original.patientId,
        therapistId,
        sessionDate: dto.sessionDate
          ? new Date(dto.sessionDate)
          : original.sessionDate,
        consultReason: dto.consultReason ?? original.consultReason,
        intervention: dto.intervention ?? original.intervention,
        agreements: dto.agreements ?? original.agreements,
        nextSessionDate: dto.nextSessionDate
          ? new Date(dto.nextSessionDate)
          : original.nextSessionDate,
        sessionType: dto.sessionType ?? original.sessionType,
        version: original.version + 1,
        previousVersionId: original.id,
        isCorrected: false,
      },
    });
  }
}