import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { getResourceFromUrl } from '../utils/audit-resource.util';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Solo registra si hay usuario autenticado
    if (!user) return next.handle();

    const method = request.method;
    const url = request.url;
    const resourceId = request.params?.id ?? request.params?.patientId ?? 'N/A';
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];

    // Determina la acción según el método HTTP
    const actionMap: Record<string, string> = {
      GET: 'VIEW',
      POST: 'CREATE',
      PATCH: 'UPDATE',
      DELETE: 'SOFT_DELETE',
    };

    const action = actionMap[method] ?? 'VIEW';
    const resource = getResourceFromUrl(url);

    return next.handle().pipe(
      tap(() => {
        // Registra después de que la respuesta fue exitosa
        this.auditService.log({
          userId: user.id,
          action,
          resource,
          resourceId,
          detail: `${method} ${url}`,
          ipAddress,
          userAgent,
        }).catch(() => {}); // Nunca falla silenciosamente el request principal
      }),
    );
  }
}