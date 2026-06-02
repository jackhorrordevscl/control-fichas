import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { RequestWithUser } from '../interfaces/request-with-user.interface';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const response = context.switchToHttp().getResponse();
    const user = request.user;
    const userIdForLog = user ? (user.userId ?? (user as any).id) : undefined;

    // Registrar incluso si no hay usuario (permitir auditar accesos fallidos)

    const method = request.method;
    const url = request.url;
    const rawResourceId = request.params?.consentId ?? request.params?.id ?? request.params?.patientId ?? 'N/A';
    const resourceId = Array.isArray(rawResourceId)
      ? rawResourceId.join(',')
      : String(rawResourceId);
    const ipAddress = request.ip;
    const userAgent = request.headers['user-agent'];
    const correlationId = request.correlationId;

    const getAction = (method: string, url: string) => {
      if (method === 'POST' && url.includes('/consents') && url.includes('/revoke')) return 'CONSENT_REVOKED';
      if (method === 'POST' && url.includes('/consents')) return 'CONSENT_CREATED';
      if (method === 'GET' && url.includes('/reports/')) return 'EXPORT_PDF';
      if (method === 'POST' && url.includes('/documents/upload')) return 'DOCUMENT_UPLOAD';
      if (method === 'POST' && url.includes('/auth/mfa/enable')) return 'MFA_ENABLED';

      const actionMap: Record<string, string> = {
        GET: 'VIEW',
        POST: 'CREATE',
        PATCH: 'UPDATE',
        DELETE: 'SOFT_DELETE',
      };

      return actionMap[method] ?? 'VIEW';
    };

    // Determina el recurso según la URL
    const getResource = (url: string) => {
      if (url.includes('/consents')) return 'Consent';
      if (url.includes('/patients')) return 'Patient';
      if (url.includes('/consultations')) return 'Consultation';
      if (url.includes('/reports')) return 'Report';
      if (url.includes('/auth/mfa')) return 'MFA';
      if (url.includes('/auth')) return 'Auth';
      return 'Unknown';
    };

    const action = getAction(method, url);
    const resource = getResource(url);

    return next.handle().pipe(
      tap(() => {
        // Registra después de que la respuesta fue exitosa
        this.auditService.log({
          userId: userIdForLog,
          action,
          resource,
          resourceId,
          detail: `${method} ${url}`,
          ipAddress,
          userAgent,
          correlationId,
          statusCode: response.statusCode,
        }).catch(() => {});
      }),
      catchError((err) => {
        // Registrar eventos fallidos o accesos denegados
        const status = err?.status ?? 500;
        const errorAction = status === 401 ? 'LOGIN_FAILED' : (status === 403 ? 'ACCESS_DENIED' : 'ERROR');

        this.auditService.log({
          userId: userIdForLog,
          action: errorAction,
          resource,
          resourceId,
          detail: `${method} ${url} - Error: ${err?.message ?? 'unknown'}`,
          ipAddress,
          userAgent,
          correlationId,
          statusCode: status,
        }).catch(() => {});

        return throwError(() => err);
      }),
    );
  }
}