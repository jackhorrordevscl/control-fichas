import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditBackupService } from './audit-backup.service';

interface CreateAuditLogDto {
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  detail?: string;
  ipAddress?: string;
  userAgent?: string;
  correlationId?: string;
  statusCode?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService, private backupService: AuditBackupService) {}

  // Único método permitido — solo escritura, nunca update ni delete
  async log(data: CreateAuditLogDto) {
    const record = await this.prisma.auditLog.create({
      data: {
        userId: data.userId ?? null,
        action: data.action as any,
        resource: data.resource,
        resourceId: data.resourceId,
        detail: data.detail,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        correlationId: data.correlationId,
        statusCode: data.statusCode,
      },
    });

    // Fire-and-forget backup to S3; failures should not block the main flow
    (async () => {
      try {
        await this.backupService.backup(record);
      } catch (e) {
        this.logger.warn('Audit backup failed', e as any);
      }
    })();

    return record;
  }
}