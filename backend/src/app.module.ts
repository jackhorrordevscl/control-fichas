import { 
  MiddlewareConsumer,
  Module,
  NestModule,
 } from '@nestjs/common';
import { CorrelationIdMiddleware } from './common/middleware/correlation-id.middleware';
import { CsrfTokenMiddleware } from './common/middleware/csrf-token.middleware';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { ConsentsModule } from './modules/consents/consents.module';
import { DataSubjectRequestsModule } from './modules/data-subject-requests/data-subject-requests.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { AuditModule } from './modules/audit/audit.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { UsersModule } from './modules/users/users.module';
import { SharedFilesModule } from './shared-files/shared-files.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    UsersModule,
    ConsentsModule,
    DataSubjectRequestsModule,
    PatientsModule,
    ConsultationsModule,
    ReportsModule,
    DocumentsModule,
    SharedFilesModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorrelationIdMiddleware)
      .forRoutes('*path');

    consumer
      .apply(CsrfTokenMiddleware)
      .forRoutes('*path');
  }
}