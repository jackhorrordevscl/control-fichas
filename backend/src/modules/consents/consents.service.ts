import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { createHash } from 'crypto';

type ConsentInput = {
  type?: string;
  version?: string;
  textHash?: string;
  method?: string;
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
    const textHash = dto.textHash?.trim();

    if (!type) {
      throw new BadRequestException('El tipo de consentimiento es obligatorio');
    }

    if (!version) {
      throw new BadRequestException('La versión del consentimiento es obligatoria');
    }

    if (!method) {
      throw new BadRequestException('El medio de consentimiento es obligatorio');
    }

    if (dto.metadata !== undefined && dto.metadata !== null && typeof dto.metadata !== 'object') {
      throw new BadRequestException('Los metadatos del consentimiento deben ser un objeto JSON');
    }

    return { type, version, method, textHash };
  }

  private extractConsentText(metadata: unknown) {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const candidate = (metadata as Record<string, unknown>).text ?? (metadata as Record<string, unknown>).consentText;
    if (typeof candidate !== 'string') {
      return undefined;
    }

    return candidate.replace(/\r\n/g, '\n').trim();
  }

  private resolveTextHash(dto: ConsentInput, consentText?: string) {
    if (dto.textHash?.trim()) {
      return dto.textHash.trim();
    }

    if (consentText) {
      return createHash('sha256').update(consentText).digest('hex');
    }

    throw new BadRequestException('Debes enviar el texto legal o su hash de referencia');
  }

  async create(patientId: string, dto: ConsentInput, recordedBy?: string | null) {
    const patient = await this.prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) throw new NotFoundException('Paciente no encontrado');

    const normalized = this.validateConsentInput(dto);
    const consentText = this.extractConsentText(dto.metadata);
    const textHash = this.resolveTextHash(dto, consentText);

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
    return this.prisma.consent.findMany({ where: { patientId }, orderBy: { grantedAt: 'desc' } });
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
