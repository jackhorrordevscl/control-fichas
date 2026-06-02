import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController } from './documents.controller';
import { PatientsModule } from '../patients/patients.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PatientsModule, AuditModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}