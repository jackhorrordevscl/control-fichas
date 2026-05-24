import * as dotenv from 'dotenv';
dotenv.config();
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? '',
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();

  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD es obligatorio para ejecutar el seed del administrador');
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim() || 'admin@umbral.cl';
  const adminName = process.env.ADMIN_NAME?.trim() || 'Administrador Umbral';
  const passwordHash = await argon2.hash(adminPassword);

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash,
      name: adminName,
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
