# Políticas y runbook operativo — Remediaciones implementadas

Este documento recoge instrucciones operativas y políticas mínimas para las correcciones aplicadas en el repositorio relacionadas con consentimiento, cifrado de backups, gestión de documentos y defensa de sesión.

Última actualización: 2026-05-30

---

## Resumen de cambios aplicados

1. Nueva entidad `Consent` (Prisma) con endpoints autenticados:
   - `POST /patients/:patientId/consents` — registrar nuevo consentimiento (requiere auth)
   - `GET /patients/:patientId/consents` — listar consentimientos
   - `POST /patients/:patientId/consents/:consentId/revoke` — revocar consentimiento

   El flujo de consentimientos exige tipo, versión, medio y hash del texto. No se deben registrar duplicados vigentes para la misma pareja tipo+versión.

2. Cifrado de backups en `backups/backup.sh` cuando existe `BACKUP_ENCRYPTION_KEY` en el entorno. El script crea un archivo cifrado con `openssl`, genera checksum y manifest, y elimina el archivo sin cifrar.

3. `Documents` ahora almacenan `contentHash` y `encrypted` en la base de datos; los documentos clínicos requieren `FILE_ENCRYPTION_KEY` o `KMS_KEY_ID` para poder subirse. Al descargar, si `encrypted` es true y la clave está disponible, el sistema descifra temporalmente para servir el archivo.

   Las subidas y descargas de documentos clínicos deben quedar auditadas. El tipo de documento debe validarse contra el catálogo Prisma antes de persistir.

4. `AuthController.logout` ahora requiere autenticación y registra explícitamente un evento `LOGOUT` en la auditoría.

5. `AuditInterceptor` mejorado para usar de forma resiliente `userId` y se mantienen eventos de login / login_failed desde `AuthService`.

6. Defensa CSRF por doble token:
   - cookie legible `umbral_csrf_token`
   - header `X-CSRF-Token` en mutaciones
   - middleware servidor que valida igualdad entre cookie y header

   Endpoints de login y verificación MFA quedan exentos para permitir el bootstrap inicial de sesión.

---

## Variables de entorno relevantes

- `DATABASE_URL` — URL de la base de datos (prisma)
- `JWT_SECRET` — secreto JWT
- `BACKUP_ENCRYPTION_KEY` — clave simétrica usada para cifrar backups. **Debe gestionarse por env y no versionarse.**
- `FILE_ENCRYPTION_KEY` — clave exclusiva para cifrar documentos clínicos. No debe reutilizarse la clave de backup.
- `KMS_KEY_ID` — identificador de KMS para cifrado de documentos y backups cuando la infraestructura lo permita.

Recomendación: almacenar `BACKUP_ENCRYPTION_KEY` en un secreto del proveedor (e.g., Vault, AWS Secrets Manager) y no en `.env` en entornos de producción.

---

## Cómo aplicar la migración localmente

Desde el directorio `/workspace/backend`:

```bash
# Generar migración y aplicarla (desarrollo)
npx prisma migrate dev --name add-consent
npx prisma migrate dev --name add_data_subject_requests
npx prisma migrate dev --name document_encryption

# Generar el cliente
npx prisma generate
```

En producción usar `prisma migrate deploy` tras validar migraciones en CI.

---

## Backup cifrado (runbook)

El script `backups/backup.sh` ya cifra el backup si `BACKUP_ENCRYPTION_KEY` está presente y además genera checksum y manifest para verificación.

Comandos útiles:

```bash
# Ejecutar backup manual y cifrar (usa la clave en .env o en entorno)
BACKUP_ENCRYPTION_KEY="$(cat /path/to/secret)" ./backups/backup.sh

# Verificar backups cifrados
ls -la backups/files
file backups/files/umbral_backup_2026-05-30_*.sql.gz.enc

# Verificar el backup más reciente
npm --prefix backend run verify:backup
```

Rotación de clave:

1. Generar nueva clave segura (ej.: `openssl rand -base64 32`).
2. Configurar la nueva clave en el orquestador/secret manager.
3. Para backups futuros, se usará la nueva clave. Para backups cifrados con la clave antigua, conservar la clave antigua hasta que se re-encripten si fuese necesario.

---

## Comentarios sobre encriptación de documentos

- Los documentos clínicos deben usar `FILE_ENCRYPTION_KEY` o `KMS_KEY_ID` separado del backup.
- Alternativa recomendada: migrar a almacenamiento de objetos (S3, GCS) y activar SSE-KMS, o cifrar con KMS al subir y almacenar sólo referencia.

---

## Endpoints añadidos y cambios de comportamiento

- `POST /patients/:patientId/consents` — crea un registro de consentimiento
- `GET /patients/:patientId/consents` — lista
- `POST /patients/:patientId/consents/:consentId/revoke` — revoca
- `POST /auth/logout` — ahora requiere JWT y registra evento `LOGOUT`
- `GET /patients/next-session` — requiere JWT (antes era público en `/patients/public/next-session`)
- Document download: `GET /documents/:id/download` — si el documento está cifrado y la clave está disponible, se sirve el archivo descifrado temporalmente.
- `POST /patients/:patientId/data-subject-requests` — registrar solicitudes del titular
- `GET /patients/:patientId/data-subject-requests` — listar solicitudes del titular
- `PATCH /patients/:patientId/data-subject-requests/:requestId/resolve` — resolver solicitud del titular

---

## Próximos pasos recomendados (prioridad 2)

1. Separar `FILE_ENCRYPTION_KEY` de `BACKUP_ENCRYPTION_KEY` y gestionar claves con KMS.
2. Implementar almacenamiento de documentos en S3 con SSE-KMS y migrar referencias.
3. Añadir pruebas unitarias/e2e para `consents` y flujo de subida/descarga cifrada.
4. Formalizar runbooks de rotación de claves y de recuperación ante incidentes.
5. Evaluar mecanismos DB-side para reforzar inmutabilidad de `AuditLog` (roles, triggers o exportación a almacenamiento append-only).

---

## Notas operativas

- No comprometas claves en el repositorio.
- Validar que `install.sh` se ejecute con `STRICT_SECRET_MODE=true` en entornos controlados; en ese modo no genera secretos automáticamente.

---

Archivo generado automáticamente por el asistente. Para cambios operativos de alto riesgo consultar con el equipo de seguridad antes de aplicar en producción.
