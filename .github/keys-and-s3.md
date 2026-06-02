# Claves de cifrado y S3 — Guía rápida

Resumen corto:
- `FILE_ENCRYPTION_KEY`: clave exclusiva para cifrar/descifrar documentos clínicos en `DocumentsService`.
- `BACKUP_ENCRYPTION_KEY`: clave exclusiva para cifrar backups automáticos.
- No usar `BACKUP_ENCRYPTION_KEY` como fallback para documentos clínicos.
- Cada backup genera un manifest y un checksum; la verificación automatizada vive en `backend/scripts/verify-backup.ts`.

Entorno y variables esperadas:
- `FILE_ENCRYPTION_KEY` — valor de la clave de cifrado de archivos (entorno de producción: gestionar con KMS/Vault, no en `.env`).
- `BACKUP_ENCRYPTION_KEY` — clave para backups.
- `KMS_KEY_ID` — identificador de KMS para envelope encryption de documentos o backups cuando el proveedor lo soporte.
- `S3_BUCKET`, `S3_REGION` — configuración opcional para subir documentos a S3.
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` — credenciales de S3 (en prod usar roles IAM en lugar de credenciales persistentes).

Recomendaciones operativas:
- Producción: almacenar claves en AWS KMS / HashiCorp Vault / Azure Key Vault. Aplicación debe recuperar claves a través de SDK o inyectadas por el orquestador (Kubernetes Secrets montadas, AWS KMS envelopes, etc.).
- No escribir claves en `.env` de repositorio ni en scripts de instalación que se suban al control de versiones.
- Para S3, usar un role con permisos mínimos: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket` sobre el prefijo `documents/`.

Runbook breve — rotación de `FILE_ENCRYPTION_KEY`:
1. Generar nueva clave segura (por ejemplo `openssl rand -hex 32`).
2. Añadir nueva clave a KMS/Vault y marcarla como activa (o crear versión nueva).
3. Actualizar la aplicación para que use la nueva clave para cifrar nuevos archivos (sin modificar los antiguos).
4. Para re-cifrar archivos antiguos (opcional): escribir un proceso seguro que lea objetos, los descifre con la clave antigua y los re-encripte con la nueva, registrando el progreso y haciendo copia de seguridad antes de cambios masivos.

Notas para desarrollo local:
- `install.sh` puede generar claves aleatorias para pruebas locales. En entorno CI/producción, deshabilitar esta generación y usar KMS.
- Si se necesita una instalación estricta, usar `STRICT_SECRET_MODE=true` y proporcionar explícitamente `DB_PASSWORD`, `JWT_SECRET`, `ADMIN_PASSWORD`, `BACKUP_ENCRYPTION_KEY` y `FILE_ENCRYPTION_KEY`.

Auditoría y seguridad:
- Las operaciones de upload/download deben estar auditadas (ya se registran en `AuditInterceptor`).
- Las operaciones de upload/download de documentos clínicos también deben registrar evento específico `DOCUMENT_UPLOAD` / `DOCUMENT_DOWNLOAD`.
- Mantener logs de acceso y rotación de claves para cumplimiento.

Contacto y próximas tareas:
- Implementar integración con un proveedor KMS (AWS KMS / Vault) y un proceso automatizado de rotación.
- Mantener `FILE_ENCRYPTION_KEY` separado de `BACKUP_ENCRYPTION_KEY` en todos los entornos.
