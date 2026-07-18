import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // T7.3 (issue #32): configurable por env para que CI (y cualquier entorno
  // de test) pueda fijar credenciales explícitas sin depender de que el
  // literal hardcodeado acá coincida por casualidad con lo que esperan los
  // e2e-specs que loguean como este admin semilla (SEED_ADMIN_EMAIL/
  // SEED_ADMIN_PASSWORD). Sin env vars seteadas, se comporta igual que
  // antes.
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@umbral.cl';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Umbral2024!';
  const passwordHash = await argon2.hash(adminPassword);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: 'Administrador Umbral',
      role: 'ADMIN',
      mfaEnabled: false,
      mustChangePassword: true,
    },
  });

  console.log(`✅ Usuario creado: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
