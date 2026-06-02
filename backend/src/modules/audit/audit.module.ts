import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditBackupService } from './audit-backup.service';

@Global()
@Module({
  providers: [AuditService, AuditBackupService],
  exports: [AuditService],
})
export class AuditModule {}