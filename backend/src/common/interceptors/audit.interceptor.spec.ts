import { of, throwError } from 'rxjs';
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

  it('audita requests sin usuario autenticado', (done) => {
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
        expect(auditServiceMock.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: undefined,
            action: 'VIEW',
            resource: 'Patient',
          }),
        );
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

  it('audita creación y revocación de consentimientos con acciones dedicadas', (done) => {
    const createConsentContext = createContext(
      {
        user: { userId: 'user-3' },
        method: 'POST',
        url: '/api/v1/patients/patient-1/consents',
        params: { patientId: 'patient-1' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      },
      { statusCode: 201 },
    );

    interceptor.intercept(createConsentContext, { handle: () => of('ok') }).subscribe({
      complete: () => {
        expect(auditServiceMock.log).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: 'user-3',
            action: 'CONSENT_CREATED',
            resource: 'Consent',
            resourceId: 'patient-1',
            statusCode: 201,
          }),
        );

        const revokeContext = createContext(
          {
            user: { userId: 'user-3' },
            method: 'POST',
            url: '/api/v1/patients/patient-1/consents/consent-1/revoke',
            params: { patientId: 'patient-1', consentId: 'consent-1' },
            ip: '127.0.0.1',
            headers: { 'user-agent': 'jest' },
          },
          { statusCode: 200 },
        );

        interceptor.intercept(revokeContext, { handle: () => of('ok') }).subscribe({
          complete: () => {
            expect(auditServiceMock.log).toHaveBeenCalledWith(
              expect.objectContaining({
                userId: 'user-3',
                action: 'CONSENT_REVOKED',
                resource: 'Consent',
                  resourceId: 'consent-1',
                statusCode: 200,
              }),
            );
            done();
          },
        });
      },
    });
  });

  it('audita errores como ACCESS_DENIED o ERROR', (done) => {
    const context = createContext(
      {
        user: { userId: 'user-4' },
        method: 'GET',
        url: '/api/v1/patients/patient-1',
        params: { patientId: 'patient-1' },
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      },
      { statusCode: 403 },
    );

    interceptor.intercept(context, {
      handle: () => throwError(() => ({ status: 403, message: 'forbidden' })),
    } as any).subscribe({
      error: () => {
        expect(auditServiceMock.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'ACCESS_DENIED',
            resource: 'Patient',
            statusCode: 403,
          }),
        );
        done();
      },
    });
  });
});