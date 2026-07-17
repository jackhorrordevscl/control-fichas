import { createHash } from 'crypto';

// SHA-256 de los valores de ejemplo que aparecen en README.md e install.sh
// (nunca el valor en claro, para no gatillar escaneo de secretos en el repo):
// si alguien copia el .env de ejemplo tal cual a producción, JWT_SECRET
// quedaría en un valor público y conocido por cualquiera que lea el repo.
const KNOWN_EXAMPLE_SECRET_HASHES = new Set([
  'e7d778b255dad9e190ffa1b2118f5992eb2b74f21ed7ed74bdf5fe2299c0d2fa', // README.md
  '051dcc7f90a515a2d0674da7f13d78fa71a183a2b5526ec995dc98c3d8add684', // install.sh
]);

const MIN_JWT_SECRET_LENGTH = 32;

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  if (config.NODE_ENV === 'production') {
    const secret =
      typeof config.JWT_SECRET === 'string' ? config.JWT_SECRET : '';

    if (
      secret.length < MIN_JWT_SECRET_LENGTH ||
      KNOWN_EXAMPLE_SECRET_HASHES.has(sha256(secret))
    ) {
      throw new Error(
        `JWT_SECRET inválido: en producción debe tener al menos ${MIN_JWT_SECRET_LENGTH} caracteres y no puede ser el valor de ejemplo de README.md/install.sh.`,
      );
    }
  }

  return config;
}
