import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSubjectRequestType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type DataSubjectRequestInput = {
  type?: string;
  details?: string;
  evidence?: unknown;
};

@Injectable()
export class DataSubjectRequestsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private validateInput(dto: DataSubjectRequestInput) {
    const type = dto.type?.trim();

    if (!type) {
      throw new BadRequestException('El tipo de solicitud es obligatorio');
    }

    if (dto.evidence !== undefined && dto.evidence !== null && typeof dto.evidence !== 'object') {
      throw new BadRequestException('La evidencia debe ser un objeto JSON');
    }

    return {
      type,
      details: dto.details?.trim() ?? null,
      evidence: dto.evidence ?? null,
    };
  }

  async create(patientId: string, dto: DataSubjectRequestInput, requestedBy?: string | null) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      throw new NotFoundException('Paciente no encontrado');
    }

    const normalized = this.validateInput(dto);

    const request = await this.prisma.dataSubjectRequest.create({
      data: {
        patientId,
        type: normalized.type as DataSubjectRequestType,
        details: normalized.details,
        evidence: normalized.evidence === null ? undefined : (normalized.evidence as Prisma.InputJsonValue),
        requestedBy: requestedBy ?? undefined,
      },
    });

    await this.auditService.log({
      userId: requestedBy ?? undefined,
      action: 'CREATE',
      resource: 'DataSubjectRequest',
      resourceId: request.id,
      detail: `Solicitud de titular ${normalized.type} registrada para paciente ${patientId}`,
      statusCode: 201,
    });

    return request;
  }

  async findAll(patientId: string) {
    return this.prisma.dataSubjectRequest.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(
    patientId: string,
    requestId: string,
    resolutionNote: string,
    resolvedBy?: string | null,
  ) {
    const request = await this.prisma.dataSubjectRequest.findUnique({ where: { id: requestId } });

    if (!request || request.patientId !== patientId) {
      throw new NotFoundException('Solicitud no encontrada');
    }

    if (request.status !== 'PENDING') {
      throw new ConflictException('La solicitud ya fue resuelta o cerrada');
    }

    const note = resolutionNote.trim();
    if (!note) {
      throw new BadRequestException('El motivo de resolución es obligatorio');
    }

    const updated = await this.prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        resolvedBy: resolvedBy ?? null,
        resolutionNote: note,
      },
    });

    await this.auditService.log({
      userId: resolvedBy ?? undefined,
      action: 'UPDATE',
      resource: 'DataSubjectRequest',
      resourceId: requestId,
      detail: `Solicitud de titular ${request.type} resuelta para paciente ${patientId}`,
      statusCode: 200,
    });

    return updated;
  }
}
