import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Verifica el enforcement real (a nivel de Postgres) de la Ley 20.584:
 * los triggers BEFORE DELETE creados en la migración
 * `prisma/migrations/20260712000000_enforce_clinical_retention/migration.sql`
 * deben bloquear cualquier hard delete de datos clínicos, incluso si se
 * intenta directamente vía Prisma (bypaseando reglas de negocio de la app).
 *
 * Requiere una base de datos Postgres real accesible por DATABASE_URL con
 * la migración `enforce_clinical_retention` aplicada. Si no hay conexión
 * disponible, este test fallará por error de conexión, no por lógica.
 */
describe('Clinical data retention trigger (e2e)', () => {
  let prisma: PrismaService;
  let therapistId: string;
  let patientId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = moduleFixture.get(PrismaService);
    await prisma.$connect();

    const therapist = await prisma.user.create({
      data: {
        email: `retention-test-${randomUUID()}@umbral.cl`,
        passwordHash: 'not-a-real-hash-test-only',
        name: 'Terapeuta Retención Test',
        role: 'THERAPIST',
      },
    });
    therapistId = therapist.id;

    const patient = await prisma.patient.create({
      data: {
        fullName: 'Paciente Retención Test',
        rut: `retention-test-${randomUUID()}`,
        birthDate: new Date('1990-01-01'),
        therapistId,
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    if (prisma && patientId) {
      // El trigger bloquea el hard delete también para la limpieza de datos
      // de este test: se desactiva puntualmente solo para remover el
      // registro de prueba y luego se reactiva de inmediato.
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Patient" DISABLE TRIGGER trg_prevent_hard_delete_patient',
      );
      await prisma.patient.deleteMany({ where: { id: patientId } });
      await prisma.$executeRawUnsafe(
        'ALTER TABLE "Patient" ENABLE TRIGGER trg_prevent_hard_delete_patient',
      );
    }

    if (prisma && therapistId) {
      await prisma.user.deleteMany({ where: { id: therapistId } });
    }

    if (prisma) {
      await prisma.$disconnect();
    }
  });

  it('rechaza el hard delete de un paciente por el trigger de retención clínica', async () => {
    await expect(
      prisma.patient.delete({ where: { id: patientId } }),
    ).rejects.toThrow(/retención obligatoria de 15 años según Ley 20\.584/);
  });
});
