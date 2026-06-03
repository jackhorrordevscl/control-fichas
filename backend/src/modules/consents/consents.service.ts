import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

type ConsentInput = {
  type?: string;
  version?: string;
  method?: string;
  documentId?: string;
  metadata?: unknown;
};

@Injectable()
export class ConsentsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private validateConsentInput(dto: ConsentInput) {
    const type = dto.type?.trim();
    const version = dto.version?.trim();
    const method = dto.method?.trim();
    const documentId = dto.documentId?.trim();

    if (!type) {
      throw new BadRequestException('El tipo de consentimiento es obligatorio');
    }

    if (!version) {
      throw new BadRequestException('La versión del consentimiento es obligatoria');
    }

    if (!method) {
      throw new BadRequestException('El medio de consentimiento es obligatorio');
    }

    if (!documentId) {
      throw new BadRequestException('El documento de respaldo es obligatorio');
    }

    if (dto.metadata !== undefined && dto.metadata !== null && typeof dto.metadata !== 'object') {
      throw new BadRequestException('Los metadatos del consentimiento deben ser un objeto JSON');
    }

    return { type, version, method, documentId };
  }

  private async resolveDocument(patientId: string, dto: ConsentInput) {
    const document = await this.prisma.patientDocument.findUnique({
      where: { id: dto.documentId!.trim() },
      select: {
        id: true,
        patientId: true,
        contentHash: true,
        fileName: true,
      },
    });

    if (!document || document.patientId !== patientId) {
      throw new BadRequestException('El documento de respaldo no existe para este paciente');
    }

    if (!document.contentHash) {
      throw new BadRequestException('El documento de respaldo no tiene hash de integridad');
    }

    return document;
  }

  async create(patientId: string, dto: ConsentInput, recordedBy?: string | null) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const normalized = this.validateConsentInput(dto);
    const document = await this.resolveDocument(patientId, dto);
    const textHash = document.contentHash;

    const activeConsent = await this.prisma.consent.findFirst({
      where: {
        patientId,
        type: normalized.type as any,
        version: normalized.version,
        revokedAt: null,
      },
    });

    if (activeConsent) {
      throw new ConflictException('Ya existe un consentimiento vigente con el mismo tipo y versión');
    }

    const consent = await this.prisma.consent.create({
      data: {
        patientId,
        documentId: document?.id,
        type: normalized.type as any,
        version: normalized.version,
        textHash,
        method: normalized.method,
        metadata: dto.metadata === undefined ? undefined : (dto.metadata as Prisma.InputJsonValue),
        grantedBy: recordedBy ?? undefined,
      },
    });

    await this.auditService.log({
      userId: recordedBy ?? undefined,
      action: 'CONSENT_CREATED',
      resource: 'Consent',
      resourceId: consent.id,
      detail: `Consentimiento ${normalized.type} v${normalized.version} registrado para paciente ${patientId}`,
      statusCode: 201,
    });

    return consent;
  }

  async findAll(patientId: string) {
    return this.prisma.consent.findMany({
      where: { patientId },
      orderBy: { grantedAt: 'desc' },
      include: {
        document: {
          select: {
            id: true,
            fileName: true,
            type: true,
            uploadedAt: true,
            contentHash: true,
          },
        },
      },
    });
  }

  async revoke(patientId: string, consentId: string, revokedBy?: string | null, reason?: string | null) {
    const consent = await this.prisma.consent.findUnique({ where: { id: consentId } });
    if (!consent || consent.patientId !== patientId) throw new NotFoundException('Consentimiento no encontrado');

    if (consent.revokedAt) {
      throw new ConflictException('El consentimiento ya fue revocado');
    }

    if (!reason?.trim()) {
      throw new BadRequestException('Debes indicar el motivo de la revocación');
    }

    const updated = await this.prisma.consent.update({
      where: { id: consentId },
      data: {
        revokedAt: new Date(),
        revokedBy: revokedBy ?? null,
        reason: reason.trim(),
      },
    });

    await this.auditService.log({
      userId: revokedBy ?? undefined,
      action: 'CONSENT_REVOKED',
      resource: 'Consent',
      resourceId: consentId,
      detail: `Consentimiento ${consent.type} revocado para paciente ${patientId}`,
      statusCode: 200,
    });

    return updated;
  }
}
