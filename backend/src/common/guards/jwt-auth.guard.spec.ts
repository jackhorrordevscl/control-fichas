import { ExecutionContext, Logger } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuditService } from '../../modules/audit/audit.service';

function buildContext(): ExecutionContext {
  const request = {
    method: 'GET',
    url: '/api/v1/patients',
    params: {},
    ip: '127.0.0.1',
    headers: { 'user-agent': 'jest' },
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('reporta el fallo de auditoría de un intento no autorizado de forma visible', async () => {
    const failingAuditService = {
      log: jest.fn().mockRejectedValue(new Error('DB no disponible')),
    } as unknown as AuditService;

    const errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    const guard = new JwtAuthGuard(failingAuditService);

    expect(() =>
      guard.handleRequest(null, false, null, buildContext()),
    ).toThrow();

    // handleRequest dispara el log de forma fire-and-forget antes de tirar
    // la excepción de Passport; esperamos el microtask para que el .catch corra.
    await new Promise((resolve) => setImmediate(resolve));

    expect(failingAuditService.log).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain(
      'Fallo al registrar intento no autorizado',
    );
    expect(errorSpy.mock.calls[0][0]).toContain('DB no disponible');

    errorSpy.mockRestore();
  });
});
