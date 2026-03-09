import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

// Normaliza RUT: quita puntos, mantiene guion, uppercase
function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').trim().toUpperCase();
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePatientDto, therapistId: string) {
    return this.prisma.patient.create({
      data: {
        ...dto,
        rut: normalizeRut(dto.rut), // siempre guardar sin puntos
        birthDate: new Date(dto.birthDate),
        therapistId,
      },
    });
  }

  async findAll(userId: string, userRole: string) {
    if (userRole === 'DIRECTOR' || userRole === 'ADMIN') {
      return this.prisma.patient.findMany({
        where: { deletedAt: null },
        include: { therapist: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    if (userRole === 'COORDINATOR') {
      return this.prisma.patient.findMany({
        where: { deletedAt: null },
        include: { therapist: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.patient.findMany({
      where: { therapistId: userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, userRole: string) {
    const patient = await this.prisma.patient.findFirst({
      where: { id, deletedAt: null },
      include: {
        therapist: { select: { id: true, name: true } },
        consultations: { orderBy: { createdAt: 'desc' } },
        documents: true,
      },
    });
    if (!patient) throw new NotFoundException('Paciente no encontrado');
    if (userRole === 'DIRECTOR' || userRole === 'ADMIN') return patient;
    if (userRole === 'COORDINATOR') {
      if (patient.therapistId !== userId) {
        throw new ForbiddenException(
          'Como Coordinador solo puedes ver la ficha clínica de tus propios pacientes',
        );
      }
      return patient;
    }
    if (patient.therapistId !== userId) {
      throw new ForbiddenException('Acceso denegado a este paciente');
    }
    return patient;
  }

  async update(id: string, dto: UpdatePatientDto, userId: string, userRole?: string) {
    await this.findOne(id, userId, userRole ?? 'THERAPIST');
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.rut && { rut: normalizeRut(dto.rut) }),
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
      },
    });
  }

  async softDelete(id: string, userId: string, userRole?: string) {
    await this.findOne(id, userId, userRole ?? 'THERAPIST');
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async consultarSesionPorRut(rut: string) {
    // Buscar con y sin guion para máxima compatibilidad
    const rutNorm = normalizeRut(rut);               // 12345678-9
    const rutSinGuion = rutNorm.replace(/-/g, '');   // 123456789

    const patient = await this.prisma.patient.findFirst({
      where: {
        deletedAt: null,
        OR: [
          { rut: rutNorm },
          { rut: rutSinGuion },
          { rut: rut.trim().toUpperCase() },
        ],
      },
      include: {
        therapist: { select: { name: true } },
        consultations: {
          where: { scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!patient) {
      return { found: false, message: 'No se encontró ningún paciente con ese RUT' };
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
