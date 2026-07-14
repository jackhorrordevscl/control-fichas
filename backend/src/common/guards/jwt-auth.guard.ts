import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuditService } from '../../modules/audit/audit.service';
import { getResourceFromUrl } from '../utils/audit-resource.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private auditService: AuditService) {
    super();
  }

  handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      const request = context.switchToHttp().getRequest();

      this.auditService
        .log({
          action: 'UNAUTHORIZED_ATTEMPT',
          resource: getResourceFromUrl(request.url),
          resourceId: request.params?.id ?? request.params?.patientId ?? 'N/A',
          detail: `${request.method} ${request.url}`,
          ipAddress: request.ip,
          userAgent: request.headers['user-agent'],
        })
        .catch(() => {});
    }

    return super.handleRequest(err, user, info, context, status);
  }
}
