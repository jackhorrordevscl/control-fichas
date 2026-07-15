import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerModuleOptions } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

/**
 * Config del throttler de POST /auth/login (T4.2, issue #20).
 *
 * Producción: LOGIN_THROTTLE_LIMIT intentos por LOGIN_THROTTLE_TTL_MS ms
 * (default 5 intentos / 60000ms).
 *
 * Jest setea NODE_ENV=test automáticamente en toda corrida de test, sin que
 * nadie tenga que configurarlo. Cuando corremos ahí Y las env vars de arriba
 * NO fueron seteadas explícitamente, usamos un límite mucho más alto (1000)
 * para no romper las suites e2e existentes, que loguean varias veces por
 * corrida contra la misma AppModule compilada. Si alguien setea las env
 * vars explícitamente (incluso en test), se respetan tal cual — así es como
 * rate-limit-login.e2e-spec.ts prueba el 429 real, vía override de DI del
 * token de opciones del ThrottlerModule, sin tocar esta rama.
 */
// Un valor no numérico en la env var (typo, string vacío) no debe apagar el
// throttler en silencio: Number('') es 0 y Number('abc') es NaN, y ambos
// harían que la comparación totalHits > limit de @nestjs/throttler nunca
// bloquee. Si el valor no parsea a un entero positivo, se ignora y se usa
// el default.
function parsePositiveInt(
  raw: string | undefined,
  fallback: number,
): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

// La app corre en Railway, detrás de su proxy de edge. Sin esto, ThrottlerGuard
// usaría su tracker por defecto (req.ip), que sin `trust proxy` configurado en
// Express resuelve a la IP del proxy para TODAS las conexiones — colapsando el
// límite de login en un único bucket global compartido por todos los usuarios,
// donde cualquiera podría agotarlo y bloquear el login de todo el mundo con
// 429. En vez de tocar la config global de Express en main.ts (que afectaría
// a cualquier otro consumidor de req.ip en la app, ej. AuditLog.ipAddress),
// esto queda acotado al throttler de login.
//
// X-Forwarded-For es una lista que cada proxy AGREGA al final, no reemplaza:
// el primer valor lo pone el cliente (así que es trivialmente falsificable
// por cualquiera que arme el request a mano) y el último valor es el que
// agregó el proxy que efectivamente conectó con este proceso. Con exactamente
// un proxy confiable delante (Railway), el último valor de la lista es el
// único que no se puede spoofear desde el cliente, así que se usa ese —
// nunca el primero — y se cae a req.ip si el header no está presente (ej.
// tests locales sin proxy).
export function getLoginTracker(req: {
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}): string {
  const forwardedFor = req.headers['x-forwarded-for'];
  const raw = Array.isArray(forwardedFor)
    ? forwardedFor.join(',')
    : forwardedFor;
  if (typeof raw === 'string') {
    const hops = raw
      .split(',')
      .map((hop) => hop.trim())
      .filter((hop) => hop.length > 0);
    if (hops.length > 0) {
      return hops[hops.length - 1];
    }
  }
  return req.ip;
}

export function buildLoginThrottlerOptions(
  config: ConfigService,
): ThrottlerModuleOptions {
  const isTest = config.get<string>('NODE_ENV') === 'test';
  const explicitLimit = config.get<string>('LOGIN_THROTTLE_LIMIT');
  const explicitTtlMs = config.get<string>('LOGIN_THROTTLE_TTL_MS');

  const limit = parsePositiveInt(explicitLimit, isTest ? 1000 : 5);
  const ttl = parsePositiveInt(explicitTtlMs, 60000);

  return {
    throttlers: [{ name: 'login', limit, ttl }],
    getTracker: getLoginTracker,
  };
}

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') as string,
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '8h') },
      }),
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: buildLoginThrottlerOptions,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule],
})
export class AuthModule {}
