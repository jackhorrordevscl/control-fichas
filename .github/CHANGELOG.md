# Changelog (resumen de cambios de seguridad y cumplimiento)

## 2026-06-03

- El consentimiento ahora queda vinculado formalmente a `PatientDocument` mediante `documentId`.
- La creación de consentimientos exige `documentId` y deriva `textHash` únicamente desde el PDF de respaldo.
- La API de consentimientos rechaza `metadata` adicional y la UI solo habilita el registro cuando hay un PDF ya subido seleccionado.
- Añadida prueba e2e HTTP del flujo de consentimientos con registro, validación, listado y revocación.
- Añadida prueba e2e HTTP de solicitudes del titular con alta, listado y resolución.
- Añadida prueba e2e HTTP del controlador de documentos con subida multipart y listado por paciente.
- Añadida prueba e2e HTTP del controlador de documentos con subida multipart, listado por paciente y descarga.
- Añadida prueba e2e del verificador de backups con checksum correcto y caso corrupto.
- Añadida prueba e2e HTTP del controlador de archivos compartidos con subida, listado y descarga.
- Añadida prueba del módulo de cifrado de documentos con round-trip local y rechazo sin llave.

## 2026-05-30

- Añadida entidad `Consent` en Prisma y módulo `consents` con endpoints para registrar y revocar consentimientos.
- Backups cifrados: `backups/backup.sh` cifra las copias si `BACKUP_ENCRYPTION_KEY` está presente.
- Subida/descarga de documentos: si `FILE_ENCRYPTION_KEY` está presente, los archivos se cifran al subir y se descifran temporalmente al descargar.
- `AuthController.logout` ahora requiere autenticación y registra evento `LOGOUT` en auditoría.
- `AuditInterceptor` extendido para registrar errores y accesos denegados (401/403).
- Endpoint `/patients/public/next-session` convertido a `/patients/next-session` y ahora requiere autenticación.
- Documentación operativa añadida en `.github/policies.md`.

---
