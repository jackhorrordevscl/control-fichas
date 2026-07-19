import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as fs from 'fs';
import * as speakeasy from 'speakeasy';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  SEED_ADMIN_EMAIL_DEFAULT,
  SEED_ADMIN_PASSWORD_DEFAULT,
} from '../prisma/seed-admin.defaults';

/**
 * T1.5 (issue #10): verifica que los endpoints sensibles (consultas, reportes,
 * documentos, pacientes) respeten la relación terapeuta-paciente aplicada por
 * PatientsService.findOne(patientId, userId, userRole):
 *   - el dueño (THERAPIST con patient.therapistId === userId) accede (2xx)
 *   - un THERAPIST sin relación con el paciente recibe 403
 *   - ADMIN accede sin restricción (2xx)
 *
 * Los fixtures (usuarios, paciente, consulta, documentos) se crean en
 * beforeAll con emails únicos por corrida (sufijo Date.now()) para que la
 * suite sea repetible sobre la misma base sin colisionar con datos de
 * pruebas manuales previas, y se eliminan en afterAll.
 */
describe('RBAC ownership guard (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const runId = Date.now();
  // ADMIN_EMAIL/ADMIN_PASSWORD: mismo default compartido con seed.ts y las
  // demás suites de auth (ver prisma/seed-admin.defaults.ts) — evita un
  // literal hardcodeado acá, que dispararía falsos positivos de secret
  // scanning (GitGuardian) en cada PR que toque este spec.
  const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? SEED_ADMIN_EMAIL_DEFAULT;
  const ADMIN_PASSWORD =
    process.env.SEED_ADMIN_PASSWORD ?? SEED_ADMIN_PASSWORD_DEFAULT;
  const TEST_PASSWORD = 'TestPass123!';

  let adminToken: string;
  let therapistAToken: string;
  let therapistBToken: string;
  let therapistAId: string;
  let therapistBId: string;

  let patientId: string;
  let consultationId: string;
  let ownerDocumentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // T4.1 (issue #19): ADMIN/DIRECTOR quedan forzados a enrolar MFA en su
    // primer login sin MFA. Se resetea el estado MFA del ADMIN seedeado
    // antes de loguear para que esta suite sea determinística sin importar
    // si una corrida previa ya completó el enrolamiento forzado (la
    // cobertura completa de ese flujo vive en
    // auth-mfa-enforcement.e2e-spec.ts).
    await prisma.user.updateMany({
      where: { email: ADMIN_EMAIL },
      data: { mfaEnabled: false, mfaSecret: null, mustChangePassword: false },
    });

    // 1. Login como ADMIN seedeado: al ser ADMIN sin MFA, el backend
    // entrega un setupToken de enrolamiento forzado en vez de accessToken.
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(201);
    expect(adminLogin.body.requiresMfaSetup).toBe(true);

    const beginSetup = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/setup/begin')
      .send({ setupToken: adminLogin.body.setupToken })
      .expect(201);

    const adminTotp = speakeasy.totp({
      secret: beginSetup.body.secret,
      encoding: 'base32',
    });

    const confirmSetup = await request(app.getHttpServer())
      .post('/api/v1/auth/mfa/setup/confirm')
      .send({ setupToken: adminLogin.body.setupToken, token: adminTotp })
      .expect(201);
    adminToken = confirmSetup.body.accessToken;

    // 2. Crear dos usuarios THERAPIST de prueba con emails únicos
    const therapistAEmail = `rbac.therapist.a.${runId}@umbral.cl`;
    const therapistBEmail = `rbac.therapist.b.${runId}@umbral.cl`;

    const therapistACreate = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: therapistAEmail,
        password: TEST_PASSWORD,
        name: 'RBAC Therapist A',
        role: 'THERAPIST',
      })
      .expect(201);
    therapistAId = therapistACreate.body.id;

    const therapistBCreate = await request(app.getHttpServer())
      .post('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: therapistBEmail,
        password: TEST_PASSWORD,
        name: 'RBAC Therapist B',
        role: 'THERAPIST',
      })
      .expect(201);
    therapistBId = therapistBCreate.body.id;

    // 3. Login como cada terapeuta
    const loginA = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: therapistAEmail, password: TEST_PASSWORD })
      .expect(201);
    therapistAToken = loginA.body.accessToken;

    const loginB = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: therapistBEmail, password: TEST_PASSWORD })
      .expect(201);
    therapistBToken = loginB.body.accessToken;

    // 4. Con el token de A: crear un paciente y una consulta para ese paciente
    const patientCreate = await request(app.getHttpServer())
      .post('/api/v1/patients')
      .set('Authorization', `Bearer ${therapistAToken}`)
      .send({
        fullName: 'RBAC Test Patient',
        rut: `RBAC${runId}`,
        birthDate: '1990-01-01',
      })
      .expect(201);
    patientId = patientCreate.body.id;

    const consultationCreate = await request(app.getHttpServer())
      .post('/api/v1/consultations')
      .set('Authorization', `Bearer ${therapistAToken}`)
      .send({
        patientId,
        sessionDate: '2026-01-01',
        consultReason: 'Motivo de prueba RBAC',
        intervention: 'Intervención de prueba RBAC',
      })
      .expect(201);
    consultationId = consultationCreate.body.id;
  });

  afterAll(async () => {
    try {
      // Guard explícito: si beforeAll falló antes de crear el paciente
      // fixture, patientId queda undefined. `where: { patientId: undefined }`
      // / `where: { id: undefined }` en Prisma NO filtra por "ningún match":
      // significa "sin filtro en ese campo", así que deleteMany() borraría
      // TODOS los pacientes/documentos/consultas de la base. El flujo de
      // login del ADMIN seedeado ahora hace varias llamadas HTTP más (T4.1,
      // issue #19: enrolamiento MFA forzado), lo que aumenta la superficie
      // para que beforeAll falle a mitad de camino, así que este guard es
      // necesario, no solo defensivo.
      if (patientId) {
        // Limpieza de archivos físicos subidos durante la suite
        const docs = await prisma.patientDocument.findMany({
          where: { patientId },
        });
        for (const doc of docs) {
          try {
            fs.unlinkSync(doc.storagePath);
          } catch {
            // el archivo puede no existir (p.ej. intento no-dueño ya autolimpiado); se ignora
          }
        }

        // Borrado respetando FKs: documentos/historial de consultas -> consultas -> paciente
        await prisma.patientDocument.deleteMany({ where: { patientId } });
        await prisma.consultationHistory.deleteMany({
          where: { consultation: { patientId } },
        });
        await prisma.consultation.deleteMany({ where: { patientId } });
        await prisma.patient.deleteMany({ where: { id: patientId } });
      }

      // Los usuarios de prueba ya generaron filas en AuditLog durante la
      // suite (cada request autenticado audita). AuditLog.userId ahora usa
      // onDelete: Restrict a propósito (T2.1) para que hard-deletear un
      // usuario con historial de auditoría sea imposible — igual que en
      // producción, donde no existe ningún prisma.user.delete(), solo
      // soft delete. Se limpia acá de la misma forma. `in: []` cuando ambos
      // ids quedan undefined no matchea nada (a diferencia de `id: undefined`
      // suelto), así que este filtro ya era seguro.
      const idsToSoftDelete = [therapistAId, therapistBId].filter(Boolean);
      if (idsToSoftDelete.length > 0) {
        await prisma.user.updateMany({
          where: { id: { in: idsToSoftDelete } },
          data: { deletedAt: new Date() },
        });
      }

      // El beforeAll de esta suite enrola MFA en el admin seedeado (línea
      // ~60) y ningún test posterior lo deshace. Sin este reset, el admin
      // queda con mfaEnabled=true y un mfaSecret generado por speakeasy que
      // no sirve fuera del test — inutilizable para cualquiera que loguee
      // después (otra suite, o un dev haciendo login manual) sin ese
      // secreto. Mismo patrón que auth-mfa-enforcement.e2e-spec.ts.
      await prisma.user.updateMany({
        where: { email: ADMIN_EMAIL },
        data: { mfaEnabled: false, mfaSecret: null },
      });
    } finally {
      await app.close();
    }
  });

  describe('Guard sin token', () => {
    it('GET /patients/:id sin Authorization header devuelve 401', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .expect(401);
    });
  });

  describe('GET /patients/:id', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/patients/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('POST /documents/upload', () => {
    it('el terapeuta dueño puede subir un documento (2xx)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${therapistAToken}`)
        .field('patientId', patientId)
        .field('type', 'OTHER')
        .attach('file', Buffer.from('contenido de prueba'), 'test-owner.pdf')
        .expect(201);
      ownerDocumentId = res.body.id;
      expect(ownerDocumentId).toBeDefined();
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${therapistBToken}`)
        .field('patientId', patientId)
        .field('type', 'OTHER')
        .attach('file', Buffer.from('contenido de prueba'), 'test-nonowner.pdf')
        .expect(403);
    });

    it('ADMIN puede subir un documento sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .post('/api/v1/documents/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .field('patientId', patientId)
        .field('type', 'OTHER')
        .attach('file', Buffer.from('contenido de prueba'), 'test-admin.pdf')
        .expect(201);
    });
  });

  describe('GET /documents/patient/:patientId', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/patient/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /documents/:id/download', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/${ownerDocumentId}/download`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/${ownerDocumentId}/download`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/documents/${ownerDocumentId}/download`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /consultations/patient/:patientId', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/patient/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('GET /consultations/:id', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('PATCH /consultations/:id/correct (versionado inmutable, T2.3)', () => {
    let correctedId: string;

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/consultations/${consultationId}/correct`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .send({ consultReason: 'Intento no autorizado' })
        .expect(403);
    });

    it('el terapeuta dueño puede corregir: crea una versión nueva (2xx)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/consultations/${consultationId}/correct`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .send({ consultReason: 'Motivo corregido por el dueño' })
        .expect(200);

      correctedId = res.body.id;
      expect(correctedId).toBeDefined();
      expect(correctedId).not.toBe(consultationId);
      expect(res.body.consultReason).toBe('Motivo corregido por el dueño');
      expect(res.body.history.length).toBe(1);
    });

    it('la versión original queda intacta y consultable por su id original', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200);

      expect(res.body.id).toBe(consultationId);
      expect(res.body.consultReason).toBe('Motivo de prueba RBAC');
    });

    it('corregir la versión original ya superada devuelve 409', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/consultations/${consultationId}/correct`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .send({ consultReason: 'Intento sobre versión vieja' })
        .expect(409);
    });

    it('ADMIN puede corregir la versión vigente sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .patch(`/api/v1/consultations/${correctedId}/correct`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ consultReason: 'Motivo corregido por ADMIN' })
        .expect(200);
    });
  });

  describe('GET /reports/patient/:patientId', () => {
    it('el terapeuta dueño accede (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/reports/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistAToken}`)
        .expect(200)
        .expect('Content-Type', 'application/pdf');
    });

    it('un terapeuta sin relación con el paciente recibe 403', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/reports/patient/${patientId}`)
        .set('Authorization', `Bearer ${therapistBToken}`)
        .expect(403);
    });

    it('ADMIN accede sin restricción (2xx)', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/reports/patient/${patientId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect('Content-Type', 'application/pdf');
    });
  });
});
