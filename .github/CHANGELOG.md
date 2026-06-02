# Changelog (resumen de cambios de seguridad y cumplimiento)

## 2026-05-30

- Añadida entidad `Consent` en Prisma y módulo `consents` con endpoints para registrar y revocar consentimientos.
- Backups cifrados: `backups/backup.sh` cifra las copias si `BACKUP_ENCRYPTION_KEY` está presente.
- Subida/descarga de documentos: si `FILE_ENCRYPTION_KEY` está presente, los archivos se cifran al subir y se descifran temporalmente al descargar.
- `AuthController.logout` ahora requiere autenticación y registra evento `LOGOUT` en auditoría.
- `AuditInterceptor` extendido para registrar errores y accesos denegados (401/403).
- Endpoint `/patients/public/next-session` convertido a `/patients/next-session` y ahora requiere autenticación.
- Documentación operativa añadida en `.github/policies.md`.

---
