import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as argon2 from 'argon2';
import { getOptionsToken } from '@nestjs/throttler';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
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
 * El usuario de prueba se crea directo por Prisma (no vía login admin) para
 * no depender en absoluto del estado de admin@umbral.cl.
 */
describe('Rate limiting en POST /auth/login (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const TEST_LIMIT = 3;
  const TEST_TTL_MS = 60000;

  const runId = Date.now();
  const UNKNOWN_EMAIL = `rate-limit.unknown.${runId}@umbral.cl`;
  const WRONG_PASSWORD = 'WrongPass123!';

  const REAL_EMAIL = `rate-limit.test.${runId}@umbral.cl`;
  const REAL_PASSWORD = 'RateLimitTest123!';
  let realUserId: string;

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

    prisma = app.get(PrismaService);

    const passwordHash = await argon2.hash(REAL_PASSWORD);
    const realUser = await prisma.user.create({
      data: {
        email: REAL_EMAIL,
        passwordHash,
        name: 'Rate Limit Test User',
        role: 'THERAPIST',
      },
    });
    realUserId = realUser.id;
  });

  afterAll(async () => {
    try {
      // Guard explícito: si beforeAll falla antes de asignar realUserId,
      // `where: { id: undefined }` en Prisma no significa "no matchear
      // nada" — significa "sin filtro en ese campo", así que deleteMany()
      // borraría toda la tabla User. No hay DB de test separada todavía,
      // así que esto pega directo contra la base real compartida.
      if (realUserId) {
        await prisma.user.deleteMany({ where: { id: realUserId } });
      }
    } finally {
      await app.close();
    }
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

  it('un login con credenciales válidas también cuenta contra el límite ya superado (429, no 200/201)', async () => {
    // El límite ya se agotó en los tests anteriores dentro de la misma
    // ventana. @nestjs/throttler cuenta todos los requests a la ruta, no
    // solo los fallidos, así que un login legítimo también debe recibir
    // 429 en vez de autenticar.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: REAL_EMAIL, password: REAL_PASSWORD })
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
