import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/v1/auth/login', '/api/v1/auth/mfa/verify']);
const CSRF_COOKIE_NAME = 'umbral_csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

function parseCookies(header: string | undefined) {
  if (!header) {
    return {} as Record<string, string>;
  }

  return header.split(';').reduce<Record<string, string>>((acc, part) => {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (!rawKey) {
      return acc;
    }

    acc[rawKey] = decodeURIComponent(rawValue.join('='));
    return acc;
  }, {});
}

@Injectable()
export class CsrfTokenMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const method = req.method.toUpperCase();
    const url = req.originalUrl || req.url;

    if (SAFE_METHODS.has(method) || EXEMPT_PATHS.has(url)) {
      return next();
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME] as string | undefined;

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      throw new ForbiddenException('CSRF token inválido o ausente');
    }

    return next();
  }
}
