import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto, therapistId: string) {
    return this.prisma.patient.create({
      data: {
        ...dto,
        birthDate: new Date(dto.birthDate),
        therapistId,
      },
    });
  }

  async findAll(therapistId: string) {
    return this.prisma.patient.findMany({
      where: {
        therapistId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, therapistId: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, therapistId, deletedAt: null },
      include: {
        consultations: {
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
      },
    });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, therapistId: string) {
    await this.findOne(id, therapistId);
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async softDelete(id: string, therapistId: string) {
    await this.findOne(id, therapistId);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async consultarSesionPorRut(rut: string) {
    const rutNormalizado = rut.replace(/\./g, '').trim().toUpperCase();

    const patient = await this.prisma.patient.findFirst({
      where: {
        rut: rutNormalizado,
        deletedAt: null,
      },
      include: {
        therapist: { select: { name: true } },
        consultations: {
          where: {
            scheduledAt: { gte: new Date() },
          },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!patient) {
      return {
        found: false,
        message: 'No se encontró ningún paciente con ese RUT',
      };
    }

    const proximaSesion = patient.consultations[0];

    if (!proximaSesion?.scheduledAt) {
      return {
        found: true,
        patientName: patient.fullName,
        therapistName: patient.therapist?.name ?? 'No asignado',
        nextSession: null,
        message: 'No tienes sesiones programadas próximamente',
      };
    }

    return {
      found: true,
      patientName: patient.fullName,
      therapistName: patient.therapist?.name ?? 'No asignado',
      nextSession: proximaSesion.scheduledAt,
      message: 'Sesión encontrada',
    };
  }
}
