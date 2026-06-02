import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { DataSubjectRequestsService } from './data-subject-requests.service';
import { DataSubjectRequestsController } from './data-subject-requests.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [DataSubjectRequestsService],
  controllers: [DataSubjectRequestsController],
  exports: [DataSubjectRequestsService],
})
export class DataSubjectRequestsModule {}
