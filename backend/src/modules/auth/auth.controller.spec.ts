import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME } from './auth.constants';

describe('AuthController', () => {
  const authServiceMock = {
    login: jest.fn(),
    verifyMfa: jest.fn(),
    generateMfaSecret: jest.fn(),
    enableMfa: jest.fn(),
    disableMfa: jest.fn(),
  };

  const configServiceMock = {
    get: jest.fn().mockReturnValue('test'),
  };

  const controller = new AuthController(
    authServiceMock as unknown as AuthService,
    configServiceMock as unknown as ConfigService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    configServiceMock.get.mockImplementation((key: string) => {
      if (key === 'NODE_ENV') {
        return 'test';
      }

      return undefined;
    });
  });

  function createResponse() {
    return {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as any;
  }

  it('setea cookie httpOnly y devuelve sólo user en login exitoso', async () => {
    const res = createResponse();
    authServiceMock.login.mockResolvedValue({
      accessToken: 'jwt-token',
      user: { id: 'user-1', email: 'user@umbral.cl', role: 'ADMIN', name: 'Admin' },
    });

    const result = await controller.login(
      { email: 'user@umbral.cl', password: '12345678' },
      {
        correlationId: 'corr-1',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'jwt-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    expect(result).toEqual({
      user: { id: 'user-1', email: 'user@umbral.cl', role: 'ADMIN', name: 'Admin' },
    });
  });

  it('no setea cookie cuando login responde flujo MFA pendiente', async () => {
    const res = createResponse();
    authServiceMock.login.mockResolvedValue({
      requiresMfa: true,
      userId: 'user-1',
    });

    const result = await controller.login(
      { email: 'user@umbral.cl', password: '12345678' },
      {
        correlationId: 'corr-1',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as any,
      res,
    );

    expect(res.cookie).not.toHaveBeenCalled();
    expect(result).toEqual({
      requiresMfa: true,
      userId: 'user-1',
    });
  });

  it('setea cookie httpOnly en verificación MFA exitosa', async () => {
    const res = createResponse();
    authServiceMock.verifyMfa.mockResolvedValue({
      accessToken: 'jwt-token',
      user: { id: 'user-1', email: 'user@umbral.cl', role: 'ADMIN', name: 'Admin' },
    });

    const result = await controller.verifyMfa(
      { userId: 'user-1', token: '123456' },
      {
        correlationId: 'corr-2',
        ip: '127.0.0.1',
        headers: { 'user-agent': 'jest' },
      } as any,
      res,
    );

    expect(res.cookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, 'jwt-token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    expect(result).toEqual({
      user: { id: 'user-1', email: 'user@umbral.cl', role: 'ADMIN', name: 'Admin' },
    });
  });

  it('limpia la cookie en logout', () => {
    const res = createResponse();

    const result = controller.logout(res);

    expect(res.clearCookie).toHaveBeenCalledWith(AUTH_COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });
    expect(result).toEqual({ message: 'Sesión cerrada correctamente' });
  });
});