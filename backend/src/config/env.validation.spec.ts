import { readFileSync } from 'fs';
import { join } from 'path';
import { validateEnv } from './env.validation';

// Se extraen del archivo real en vez de copiarlas como literales para (a) no
// gatillar escaneo de secretos con un string con forma de credencial y (b)
// detectar si README.md/install.sh cambian su valor de ejemplo sin actualizar
// env.validation.ts.
function extractJwtSecretExample(filePath: string): string {
  const content = readFileSync(filePath, 'utf-8');
  const matches = [...content.matchAll(/JWT_SECRET="([^"]+)"/g)];
  if (matches.length !== 1) {
    throw new Error(
      `Se esperaba exactamente un JWT_SECRET de ejemplo en ${filePath}, se encontraron ${matches.length}`,
    );
  }
  return matches[0][1];
}

const readmeExampleSecret = extractJwtSecretExample(
  join(__dirname, '../../../README.md'),
);
const installShExampleSecret = extractJwtSecretExample(
  join(__dirname, '../../../install.sh'),
);

describe('validateEnv', () => {
  it('permite un JWT_SECRET largo y no genérico en producción', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: 'a'.repeat(32),
    };

    expect(validateEnv(config)).toBe(config);
  });

  it('rechaza un JWT_SECRET demasiado corto en producción', () => {
    const config = { NODE_ENV: 'production', JWT_SECRET: 'corto' };

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET inválido/);
  });

  it('rechaza el valor de ejemplo de README.md en producción', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: readmeExampleSecret,
    };

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET inválido/);
  });

  it('rechaza el valor de ejemplo de install.sh en producción', () => {
    const config = {
      NODE_ENV: 'production',
      JWT_SECRET: installShExampleSecret,
    };

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET inválido/);
  });

  it('rechaza JWT_SECRET ausente en producción', () => {
    const config = { NODE_ENV: 'production' };

    expect(() => validateEnv(config)).toThrow(/JWT_SECRET inválido/);
  });

  it('no valida JWT_SECRET fuera de producción', () => {
    const config = { NODE_ENV: 'test', JWT_SECRET: 'corto' };

    expect(validateEnv(config)).toBe(config);
  });
});
