import { of } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditInterceptor } from './audit.interceptor';

describe('AuditInterceptor', () => {
  const auditServiceMock = {
    log: jest.fn().mockResolvedValue(undefined),
  };

  const interceptor = new AuditInterceptor(auditServiceMock as unknown as AuditService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function createContext(request: Record<string, unknown>, response: Record<string, unknown>) {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as any;
  }

  it('no audita requests sin usuario autenticado', (done) => {
    const context = createContext(
      {
        method: 'GET',
        url: '/api/v1/patients',
        headers: {},
      },
      { statusCode: 200 },
    );

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      complete: () => {
        expect(auditServiceMock.log).not.toHaveBeenCalled();
        done();
      },
    });
  });

  it('audita exportación PDF con correlationId y statusCode', (done) => {
    const context = createContext(
      {
        user: { userId: 'user-1' },
        method: 'GET',
        url: '/api/v1/reports/patient/patient-1',
        params: { patientId: 'patient-1' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
        correlationId: 'corr-1',
      },
      { statusCode: 200 },
    );

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      complete: () => {
        expect(auditServiceMock.log).toHaveBeenCalledWith({
          userId: 'user-1',
          action: 'EXPORT_PDF',
          resource: 'Report',
          resourceId: 'patient-1',
          detail: 'GET /api/v1/reports/patient/patient-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          correlationId: 'corr-1',
          statusCode: 200,
        });
        done();
      },
    });
  });

  it('audita upload de documento con acción específica', (done) => {
    const context = createContext(
      {
        user: { userId: 'user-2' },
        method: 'POST',
        url: '/api/v1/documents/upload',
        params: {},
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      },
      { statusCode: 201 },
    );

    interceptor.intercept(context, { handle: () => of('ok') }).subscribe({
      complete: () => {
        expect(auditServiceMock.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-2',
            action: 'DOCUMENT_UPLOAD',
            resource: 'Unknown',
            resourceId: 'N/A',
            statusCode: 201,
          }),
        );
        done();
      },
    });
  });
});