import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

function normalizeRut(rut: string): string {
  return rut.replace(/\./g, '').trim().toUpperCase();
}

function formatRutForSearch(rut: string): string {
  const normalized = normalizeRut(rut).replace(/-/g, '');

  if (normalized.length <= 1) {
    return normalized;
  }

  return `${normalized.slice(0, -1)}-${normalized.slice(-1)}`;
}

function isDate(val: unknown): val is Date {
  return val !== null && val !== undefined && Object.prototype.toString.call(val) === '[object Date]';
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  private buildWhere(
    userId: string,
    userRole: string,
    query?: string,
  ): Prisma.PatientWhereInput {
    const where: Prisma.PatientWhereInput = {
      deletedAt: null,
    };

    if (
      userRole !== Role.DIRECTOR &&
      userRole !== Role.ADMIN &&
      userRole !== Role.COORDINATOR
    ) {
      where.therapistId = userId;
    }

    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
      return where;
    }

    const normalizedRut = normalizeRut(trimmedQuery);
    const formattedRut = formatRutForSearch(trimmedQuery);

    return {
      ...where,
      OR: [
        { fullName: { contains: trimmedQuery, mode: 'insensitive' } },
        { rut: { contains: normalizedRut } },
        { rut: { contains: formattedRut } },
      ],
    };
  }

  async create(dto: CreatePatientDto, therapistId: string) {
    try {
      return await this.prisma.patient.create({
        data: {
          ...dto,
          rut: normalizeRut(dto.rut),
          birthDate: new Date(dto.birthDate),
          therapistId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Ya existe un paciente registrado con ese RUT');
      }

      throw error;
    }
  }

  async findAll(userId: string, userRole: string, query?: string) {
    const where = this.buildWhere(userId, userRole, query);

    if (
      userRole === Role.DIRECTOR ||
      userRole === Role.ADMIN ||
      userRole === Role.COORDINATOR
    ) {
      return this.prisma.patient.findMany({
        where,
        include: { therapist: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    return this.prisma.patient.findMany({
      where,
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
    const current = await this.findOne(id, userId, userRole ?? 'THERAPIST');

    const { reason, ...fields } = dto;

    // Calcular diff: solo campos que realmente cambian
    const diff: Record<string, { from: unknown; to: unknown }> = {};
    for (const key of Object.keys(fields) as (keyof typeof fields)[]) {
      const incoming = fields[key];
      if (incoming === undefined) continue;

      const currentVal = (current as Record<string, unknown>)[key];

      const incomingStr = isDate(incoming)
        ? incoming.toISOString()
        : String(incoming);
      const currentStr = isDate(currentVal)
        ? currentVal.toISOString()
        : currentVal !== null && currentVal !== undefined
          ? String(currentVal)
          : null;

      if (incomingStr !== currentStr) {
        diff[key] = { from: currentVal, to: incoming };
      }
    }

    // Sin cambios reales → no tocar la DB
    if (Object.keys(diff).length === 0) {
      return current;
    }

    // Snapshot sin relaciones
    const { therapist, consultations, documents, ...snapshot } = current as any;

   return this.prisma.$transaction(async (tx) => {
  await tx.patientHistory.create({
    data: {
      patientId: id,
      changedById: userId,
      reason,
      snapshot: JSON.parse(JSON.stringify(snapshot)),
      diff: JSON.parse(JSON.stringify(diff)),
    },
  });

      return tx.patient.update({
        where: { id },
        data: {
          ...fields,
          ...(fields.rut && { rut: normalizeRut(fields.rut) }),
          ...(fields.birthDate && { birthDate: new Date(fields.birthDate) }),
        },
      });
    });
  }

  async softDelete(id: string, userId: string, userRole?: string) {
    await this.findOne(id, userId, userRole ?? 'THERAPIST');
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getHistory(id: string, userId: string, userRole: string) {
    await this.findOne(id, userId, userRole);

    return this.prisma.patientHistory.findMany({
      where: { patientId: id },
      include: {
        changedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { changedAt: 'desc' },
    });
  }

  async consultarSesionPorRut(rut: string) {
    const rutNorm = normalizeRut(rut);
    const rutSinGuion = rutNorm.replace(/-/g, '');

    await this.prisma.patient.findFirst({
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
          where: { nextSessionDate: { gte: new Date() } },
          orderBy: { nextSessionDate: 'asc' },
          take: 1,
        },
      },
    });

    return {
      message: 'Para confirmar tu agenda, comunícate con tu terapeuta por los canales habituales.',
    };
  }
}