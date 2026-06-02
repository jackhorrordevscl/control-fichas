import { Module } from '@nestjs/common';
import { ConsentsService } from './consents.service';
import { ConsentsController } from './consents.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [ConsentsService],
  controllers: [ConsentsController],
  exports: [ConsentsService],
})
export class ConsentsModule {}
