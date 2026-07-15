import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { getOptionsToken } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { getLoginTracker } from '../src/modules/auth/auth.module';

/**
 * T4.2 (issue #20): POST /auth/login responde 429 al superar el límite de
 * intentos configurado.
 *
 * auth.module.ts sube el límite de login automáticamente cuando
 * NODE_ENV=test (ver buildLoginThrottlerOptions) para no romper las demás
 * suites e2e, que loguean varias veces por corrida contra la misma
 * AppModule compilada. Si esta suite dependiera de ese límite alto nunca
 * vería un 429, así que compila su PROPIA instancia de AppModule con un
 * override de DI acotado a esa TestingModule (overrideProvider del token de
 * opciones del ThrottlerModule vía getOptionsToken()). Este override es
 * local a esta instancia de test: no muta process.env, y el aislamiento no
 * depende de si Jest corre los specs en serie o en paralelo — cada
 * TestingModule arma su propio contenedor DI con su propia instancia de
 * ThrottlerStorageService, así que el contador de esta suite nunca se
 * mezcla con el de otro archivo de test.
 *
 * ThrottlerGuard corre en la fase de Guards de Nest, antes que cualquier
 * ValidationPipe o el AuthService — nunca llega a evaluar si las
 * credenciales son válidas. Por eso ningún test de esta suite necesita un
 * usuario real: el 429 sale igual con cualquier payload una vez agotado el
 * límite.
 */
describe('Rate limiting en POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;

  const TEST_LIMIT = 3;
  const TEST_TTL_MS = 60000;

  const runId = Date.now();
  const UNKNOWN_EMAIL = `rate-limit.unknown.${runId}@umbral.cl`;
  const WRONG_PASSWORD = 'WrongPass123!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getOptionsToken())
      .useValue({
        throttlers: [{ name: 'login', limit: TEST_LIMIT, ttl: TEST_TTL_MS }],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`permite hasta ${TEST_LIMIT} intentos fallidos (401 por credenciales inválidas)`, async () => {
    for (let i = 0; i < TEST_LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: UNKNOWN_EMAIL, password: WRONG_PASSWORD })
        .expect(401);
    }
  });

  it(`el intento número ${TEST_LIMIT + 1} contra la ruta responde 429`, async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: UNKNOWN_EMAIL, password: WRONG_PASSWORD })
      .expect(429);
  });

  it('cualquier intento adicional también cuenta contra el límite ya superado (429, no 401)', async () => {
    // El límite ya se agotó en los tests anteriores dentro de la misma
    // ventana. @nestjs/throttler cuenta todos los requests a la ruta antes
    // de que el Guard deje pasar al AuthService, así que ni siquiera
    // importa si el payload sería válido — el resultado es 429 igual.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: UNKNOWN_EMAIL, password: WRONG_PASSWORD })
      .expect(429);
  });
});

/**
 * T4.2 (issue #20, hallazgo de code review): POST /auth/mfa/verify también
 * responde 429 al superar el límite. Esta ruta es el segundo paso del login
 * (se llama sin JWT, con userId + código TOTP), por eso no puede llevar
 * JwtAuthGuard — antes de este fix no tenía ningún guard, y permitía fuerza
 * bruta ilimitada sobre el TOTP de 6 dígitos de cualquier userId conocido.
 */
describe('Rate limiting en POST /auth/mfa/verify (e2e)', () => {
  let app: INestApplication<App>;

  const TEST_LIMIT = 3;
  const TEST_TTL_MS = 60000;

  const runId = Date.now();
  const UNKNOWN_USER_ID = `00000000-0000-4000-8000-${String(runId).padStart(12, '0')}`;
  const WRONG_TOKEN = '000000';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getOptionsToken())
      .useValue({
        throttlers: [{ name: 'login', limit: TEST_LIMIT, ttl: TEST_TTL_MS }],
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`permite hasta ${TEST_LIMIT} intentos con userId/token inválidos (401)`, async () => {
    for (let i = 0; i < TEST_LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/auth/mfa/verify')
        .send({ userId: UNKNOWN_USER_ID, token: WRONG_TOKEN })
        .expect(401);
    }
  });

  it(`el intento número ${TEST_LIMIT + 1} contra la ruta responde 429`, async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/verify')
      .send({ userId: UNKNOWN_USER_ID, token: WRONG_TOKEN })
      .expect(429);
  });
});

/**
 * getLoginTracker decide contra qué IP se cuenta el límite de intentos.
 * X-Forwarded-For es una lista que cada proxy AGREGA al final: el primer
 * valor lo pone el cliente (falsificable por cualquiera que arme el request
 * a mano) y el último es el que agregó el único proxy confiable (Railway).
 * Usar el valor equivocado (el primero) deja el rate limiting completamente
 * evadible por cualquier atacante que no pase por un navegador — por eso
 * esto se prueba directo, sin depender de que algún test e2e lo ejercite de
 * forma indirecta.
 */
describe('getLoginTracker (unit)', () => {
  it('usa req.ip si no hay header x-forwarded-for', () => {
    expect(getLoginTracker({ headers: {}, ip: '10.0.0.5' })).toBe('10.0.0.5');
  });

  it('usa la unica IP presente cuando x-forwarded-for trae un solo valor', () => {
    expect(
      getLoginTracker({
        headers: { 'x-forwarded-for': '203.0.113.7' },
        ip: '10.0.0.5',
      }),
    ).toBe('203.0.113.7');
  });

  it('usa la ULTIMA IP de la lista, no la primera (la primera la controla el cliente)', () => {
    expect(
      getLoginTracker({
        // Un atacante que arma el request a mano podría prependear
        // cualquier IP falsa acá; solo el proxy real agrega la última.
        headers: { 'x-forwarded-for': '198.51.100.99, 203.0.113.7' },
        ip: '10.0.0.5',
      }),
    ).toBe('203.0.113.7');
  });

  it('soporta x-forwarded-for como array de headers duplicados', () => {
    expect(
      getLoginTracker({
        headers: { 'x-forwarded-for': ['198.51.100.99', '203.0.113.7'] },
        ip: '10.0.0.5',
      }),
    ).toBe('203.0.113.7');
  });
});
