import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await argon2.hash('Umbral2024!');

  const user = await prisma.user.upsert({
    where: { email: 'admin@umbral.cl' },
    update: {},
    create: {
      email: 'admin@umbral.cl',
      passwordHash,
      name: 'Administrador Umbral',
      role: 'ADMIN',
      mfaEnabled: false,
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
