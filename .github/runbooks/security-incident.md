# Runbook de incidente de seguridad

## Objetivo

Responder de forma controlada ante sospecha o confirmación de exposición de credenciales, sesión, documentos o datos clínicos.

## Triggers

- Detección de acceso no autorizado.
- Tokens o secretos comprometidos.
- Descarga masiva o anómala de documentos.
- Drift o manipulación en auditoría.
- Señales de CSRF o abuso de sesión.

## Primeros 15 minutos

1. Congelar despliegues.
2. Revocar o rotar secretos afectados:
   - `JWT_SECRET`
   - `FILE_ENCRYPTION_KEY`
   - `BACKUP_ENCRYPTION_KEY`
3. Invalidar sesiones activas si la plataforma lo permite.
4. Revisar logs de `AuditLog` y backups.
5. Confirmar si el incidente afecta documentos, consentimientos o sesiones.

## Contención

- Deshabilitar temporalmente rutas sensibles si hay abuso activo.
- Bloquear cuentas comprometidas.
- Forzar reautenticación cuando sea posible.
- Revisar acceso a S3 o almacenamiento local.

## Erradicación

- Corregir la causa raíz.
- Revisar reglas de CSRF y cookies.
- Verificar permisos IAM mínimos.
- Revalidar inmutabilidad de auditoría.

## Recuperación

- Rehabilitar servicios por etapas.
- Verificar migraciones y cliente Prisma.
- Repetir pruebas de login, `/auth/me`, consentimiento, documentos y backup.

## Evidencia posterior

- Línea de tiempo del incidente.
- Activos afectados.
- Acciones de rotación.
- Resultado de pruebas de recuperación.
- Lecciones aprendidas y cambios permanentes.

## Cierre

No cerrar el incidente sin evidencia de contención, erradicación y restauración funcional.
