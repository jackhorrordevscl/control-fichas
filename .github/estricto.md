# Informe consolidado — Auditoría y remediaciones recomendadas

**Proyecto:** Umbral SpA — Control de Fichas Clínicas
**Fecha:** 2026-05-30
**Autor:** Informe automático basado en revisión del repositorio y auditorías internas provistas

---

## 1. Resumen ejecutivo

Tras revisar el repositorio y contrastar su estado con los tres documentos de auditoría adjuntos, el estado general es:

- Estado técnico: la aplicación es madura y contiene muchas implementaciones relevantes (modelo Prisma con historial y auditoría, controles RBAC parciales, versionado parcial de consultas, backups automatizados, validaciones de consentimiento en flujo de consultas).
- Estado de cumplimiento legal estricto: parcial. Existen brechas críticas que impiden declarar cumplimiento robusto frente a la Ley 20.584, Ley 19.628 y las exigencias reforzadas asociadas a la Ley 21.719. Las auditorías adjuntas identifican con fundamento técnico los puntos críticos.

Principales brechas críticas observadas (resumen):
- `Consentimiento`: modelo booleano insuficiente para evidencia jurídica trazable (versión de texto, firma, medio, revocación).
- `Documentos y backups`: almacenamiento por ruta en disco y backups con `pg_dump | gzip` sin cifrado ni gestión de claves.
- `Trazabilidad/inmutabilidad`: auditoría aplicativa presente pero sin enforcement de inmutabilidad a nivel DB.
- `Identidad`: inconsistencias `userId` vs `id` en distintos puntos (auditoría, guards, servicios), riesgo de ruptura de trazabilidad y MFA.
- `RBAC y superficie expuesta`: controles aplicativos parciales; existen endpoints y casos (e.g., consulta próxima sesión por RUT) que requieren revisión o autenticación.

---

## 2. Evidencia técnica verificada

Lista no exhaustiva de archivos clave que respaldan las conclusiones (vínculos al repo):

- Modelo y enums:
  - [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- Pacientes (filtros, acceso, history):
  - [backend/src/modules/patients/patients.service.ts](backend/src/modules/patients/patients.service.ts)
- Consultas (creación, corrección/versionado, validación de consentimientos):
  - [backend/src/modules/consultations/consultations.service.ts](backend/src/modules/consultations/consultations.service.ts)
- Documentos (almacenamiento por path y metadatos):
  - [backend/src/modules/documents/documents.service.ts](backend/src/modules/documents/documents.service.ts)
- Reportes / PDF (genera ficha que indica consentimiento pero sin evidencia legal):
  - [backend/src/modules/reports/reports.service.ts](backend/src/modules/reports/reports.service.ts)
- Auditoría (servicio e interceptor):
  - [backend/src/modules/audit/audit.service.ts](backend/src/modules/audit/audit.service.ts)
  - [backend/src/common/interceptors/audit.interceptor.ts](backend/src/common/interceptors/audit.interceptor.ts)
- Scripts operativos de respaldo e instalación:
  - [backups/backup.sh](backups/backup.sh)
  - [install.sh](install.sh)
- Frontend: manejo de sesión y contexto de autenticación:
  - [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx)
  - [frontend/src/components/Layout.tsx](frontend/src/components/Layout.tsx) (cambios de UI locales aplicados)

---

## 3. Hallazgos detallados y su impacto

### 3.1 Consentimiento trazable (Crítico)

Descripción técnica:
- El esquema Prisma almacena `consentSigned` y `telemedConsentSigned` como flags (booleanos) en `Patient` y los documentos de consentimiento pueden existir como `PatientDocument` con `DocumentType.INFORMED_CONSENT`.
- No existe una entidad `Consent` que registre versión del texto, fecha/hora jurídica, firmante, medio o revocación.

Impacto legal y operativo:
- Un booleano no permite demostrar ante auditoría cuándo y bajo qué texto se obtuvo el consentimiento, ni gestionar revocaciones con evidencia.

Recomendación alta:
- Implementar entidad `Consent` en Prisma con campos: `id`, `patientId`, `type`, `version`, `textHash` (o referencia a documento), `grantedAt`, `grantedBy` (actor), `method` (firma electrónica/presencial), `revokedAt`, `revokedBy`, `reason`, `metadata` (json).
- Endpoints: registrar, consultar historial, revocar, validar vigencia (middleware que valide consentimiento vigente al crear/modificar recursos clínicos).

Referencia técnica: [backend/prisma/schema.prisma](backend/prisma/schema.prisma), [backend/src/modules/consultations/consultations.service.ts](backend/src/modules/consultations/consultations.service.ts).

---

### 3.2 Protección de documentos y backups (Crítico)

Descripción técnica:
- `PatientDocument.storagePath` contiene rutas de disco; `DocumentsService` lee/describe archivos y `backups/backup.sh` genera backups con `pg_dump | gzip` sin cifrado adicional.

Impacto:
- Si el host o almacenamiento se ve comprometido, los documentos clínicos y backups quedan expuestos en texto/archivos comprimidos.

Recomendaciones:
- Introducir cifrado en reposo para documentos sensibles: opción 1) usar un servicio de objetos (S3 o equivalente) con cifrado gestionado por proveedor; opción 2) cifrar archivos antes de persistir con una clave gestionada por la app/servicio de KMS.
- Cifrar backups en el script: por ejemplo `pg_dump ... | gpg --encrypt --recipient "${BACKUP_RECIPIENT}" > file.sql.gpg` o usar `openssl` con una `BACKUP_ENCRYPTION_KEY` (pero preferir KMS). Documentar gestión de claves y rotación.
- Registrar hash/firmas de integridad y auditoría de descargas.

Referencia técnica: [backend/src/modules/documents/documents.service.ts](backend/src/modules/documents/documents.service.ts), [backups/backup.sh](backups/backup.sh).

---

### 3.3 Trazabilidad e inmutabilidad de auditoría (Alto)

Descripción técnica:
- `AuditService.log` solo realiza `create` en la tabla `AuditLog`. El interceptor escribe tras respuestas exitosas.
- No hay enforcement DB (triggers/roles) que impida modificaciones directas sobre la tabla a nivel de base de datos.
- `audit.interceptor.ts` solo registra si existe `request.user`, y registra después de respuestas exitosas (no registra accesos fallidos cuando el usuario no está presente).

Impacto:
- Desde un punto de vista probatorio, una bitácora debe ser lo más inmutable posible y registrar eventos críticos (incluyendo fallos de autenticación, `LOGOUT`, descargas de documentos, exports) y no depender solo de la política a nivel de aplicación.

Recomendaciones:
- Añadir eventos auditables explícitos para `LOGIN_FAILED`, `LOGOUT`, descargas de documentos y accesos denegados.
- Evaluar mecanismos DB para reforzar inmutabilidad: tablespaces con permisos limitados, políticas `REVOKE UPDATE/DELETE`, triggers que registren attempts o incluso exportar a un almacenamiento append-only seguro.
- Ajustar `AuditInterceptor` para capturar más eventos (incluir fallos cuando aplique) y usar `user.id` consistente.

Referencia técnica: [backend/src/modules/audit/audit.service.ts](backend/src/modules/audit/audit.service.ts), [backend/src/common/interceptors/audit.interceptor.ts](backend/src/common/interceptors/audit.interceptor.ts).

---

### 3.4 Identidad inconsistente `userId` vs `id` (Alto)

Descripción técnica:
- El interceptor de auditoría usa `user.userId` al loguear, mientras que otras partes de la app (servicios, Prisma y frontend) usan `id` o `user.id`.

Impacto:
- Pérdida de trazabilidad coherente entre JWT, auditoría y tablas relacionadas; fallos en MFA y errores lógicos.

Recomendación:
- Definir una convención única (preferible: usar `id` en payload y en la app). Actualizar capa de autenticación para exponer siempre `id` y revisar `AuditInterceptor` para que use `user.id` o el campo correcto. Añadir tests que verifiquen que el campo usado en el token coincide con el modelo aplicado.

Referencia técnica: [backend/src/common/interceptors/audit.interceptor.ts](backend/src/common/interceptors/audit.interceptor.ts), [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx).

---

### 3.5 RBAC y superficie expuesta (Medio-Alto)

Descripción técnica:
- El `Role` enum y su uso en servicios (por ejemplo en `PatientsService.buildWhere`) implementan reglas, pero no todas las rutas críticas están cubiertas por policies/guards uniformes.
- Existe una ruta de consulta por RUT con posible exposición si se hace pública: [backend/src/modules/patients/patients.service.ts#consultarSesionPorRut].

Impacto:
- Exposición de información sensible si endpoints públicos no se restringen o si las guards no se aplican en todos los controladores.

Recomendaciones:
- Revisar todos los controladores (reports, documents, consultations) y asegurar `RolesGuard` y/o validaciones de ownership donde aplique.
- Cerrar o requerir autenticación para endpoints públicos por RUT; si se necesita, devolver solo información mínima no identificatoria o introducir mecanismos de token temporal.

---

## 4. Plan de remediación priorizado (acciones concretas)

Prioridad 1 (mitigación inmediata — 0–2 semanas):
- Implementar entidad `Consent` y endpoints básicos (migración Prisma, servicio, controller, tests e2e mínimos).
- Cifrar backups en `backups/backup.sh` y documentar `BACKUP_ENCRYPTION_KEY`/KMS; eliminar valores por defecto con secrets en `install.sh`.
- Corregir inconsistencia de `userId`/`id` y adaptar `AuditInterceptor` para utilizar el campo canónico.
- Denegar/ajustar cualquier endpoint público que devuelva datos identificatorios por RUT (o exigir autenticación).

Prioridad 2 (aseguramiento probatorio y ampliación — 2–6 semanas):
- Implantar cifrado en reposo para documentos clínicos (usar S3 con SSE-KMS o cifrado app-side con KMS).
- Extender auditoría para eventos adicionales (`LOGOUT`, `LOGIN_FAILED`, descargas), y añadir pruebas.
- Forzar inmutabilidad con mecanismos DB o procesos de exportación append-only.
- Revisar almacenamiento de JWT en frontend: preferir cookie `httpOnly` para producción.

Prioridad 3 (operacional y acreditación — 6+ semanas):
- Implementar módulo de `SolicitudesTitular` para derechos del titular (acceso/rectificación/revocación/exportación) con trazabilidad completa.
- Documentar política de custodia y retención por entidad; automatizar preservación de versiones legales.
- Preparar evidencia operativa para despliegues (checklists de Render/Vercel/Supabase, pruebas de migración aplicadas, acceso cookie-secure y secrets gestionados por entorno).

---

## 5. Cambios técnicos propuestos (especificaciones rápidas)

1. Prisma: nueva migración que añade tabla `Consent` con campos propuestos y relación con `Patient` y `PatientDocument`.
2. Backend: `consents.service.ts`, `consents.controller.ts` con endpoints: `POST /patients/:id/consents`, `GET /patients/:id/consents`, `POST /patients/:id/consents/:consentId/revoke`.
3. Middleware: `requireConsent` que valide vigencia en endpoints clínicos (create consultation, create report, export PDF).
4. Backup: actualizar `backups/backup.sh` para cifrar con `gpg` o `openssl` usando `BACKUP_RECIPIENT` o `BACKUP_ENCRYPTION_KEY` y agregar variables de entorno obligatorias en `install.sh`.
5. Auditoría: actualizar `audit.interceptor.ts` para
   - usar `user.id` consistente,
   - registrar `LOGOUT` en `auth.controller` cuando se cierre sesión,
   - loggear respuestas con `statusCode` y registrar errores y accesos denegados.
6. Documentos: cambiar `storagePath` para persistir la referencia a objeto cifrado o ruta en S3, y guardar `contentHash` para integridad.

---

## 6. Acciones inmediatas que puedo aplicar (si autorizas)

Puedo empezar por cualquiera de estas tareas. Recomiendo iniciar por la primera (mayor impacto técnico-legal):

- Crear la entidad `Consent` (migración Prisma, servicio, controller, tests). Esto requiere aplicar `npx prisma migrate dev` y actualizaciones backend.

Alternativa de bajo impacto inmediato:
- Actualizar `backups/backup.sh` para cifrar backups y agregar la variable de entorno `BACKUP_ENCRYPTION_KEY` en `install.sh`.

Indica cuál prefieres y lo implemento.

---

## 7. Criterios de aceptación (para marcar cierre)

Cada frente se considera cerrado cuando cumple simultáneamente:
1. Código y migraciones aplicadas en el repo.
2. Tests unitarios/e2e que validen el comportamiento crítico.
3. Documentación (runbook/política) para la operación y gestión de claves/secrets.
4. Evidencia operativa mínima (log de migración, checklist de despliegue, backup cifrado verificado).

---

## 8. Apéndice: archivos y referencias citadas

- [backend/prisma/schema.prisma](backend/prisma/schema.prisma)
- [backend/src/modules/patients/patients.service.ts](backend/src/modules/patients/patients.service.ts)
- [backend/src/modules/consultations/consultations.service.ts](backend/src/modules/consultations/consultations.service.ts)
- [backend/src/modules/documents/documents.service.ts](backend/src/modules/documents/documents.service.ts)
- [backend/src/modules/reports/reports.service.ts](backend/src/modules/reports/reports.service.ts)
- [backend/src/modules/audit/audit.service.ts](backend/src/modules/audit/audit.service.ts)
- [backend/src/common/interceptors/audit.interceptor.ts](backend/src/common/interceptors/audit.interceptor.ts)
- [backups/backup.sh](backups/backup.sh)
- [install.sh](install.sh)
- [frontend/src/context/AuthContext.tsx](frontend/src/context/AuthContext.tsx)

---

Si quieres, ejecuto ahora la: (A) implementación de la entidad `Consent` (migración + endpoints + tests), o (B) cambio inmediato del script de backup para cifrado. Indica la opción o pide otra prioridad.
