# Auditoría Estricta de Cumplimiento Legal

**Proyecto:** Control Fichas Clínicas / Umbral SpA  
**Fecha:** 24-05-2026  
**Alcance:** repositorio actual, validaciones ejecutables locales y documentación interna  
**Marco considerado:** Ley 20.584, Ley 19.628 y exigencias técnicas esperables del marco reforzado de protección de datos asociado a Ley 21.719  
**Naturaleza del documento:** auditoría técnico-normativa. No reemplaza informe jurídico formal ni evaluación organizacional externa.

---

## 1. Dictamen Ejecutivo

## Addendum de avance 2026-06-05 (análisis completo del repositorio)

Tras un análisis exhaustivo del código fuente realizado el 2026-06-05, se constató que múltiples frentes críticos del plan de endurecimiento estaban **completamente implementados en el código pero no documentados** en los archivos `.github/`. Se actualizan todos los documentos de auditoría y plan para reflejar el estado real.

### Nuevos controles verificados en el código:

**AWS KMS — implementado y no documentado:**
- `backend/src/modules/documents/encryption.ts`: envelope encryption AES-256-GCM con ruta KMS (prioridad) y ruta local (fallback). Detecta automáticamente el modo por `KMS_KEY_ID`.
- Clave KMS real: `arn:aws:kms:sa-east-1:505718059430:key/2c56ab46-dc28-4992-a9a9-cec3c20f4683`
- Políticas IAM creadas: `kms-app-policy.json`, `kms-admin-policy.json`, `kms-use-policy.json`, `trust-policy.json`
- Script de verificación: `backend/scripts/verify-kms.ts`

**Cifrado de documentos clínicos en reposo — implementado:**
- `documents.service.ts`: rechaza upload de `PATIENT_REPORT` y `CONSULTATION_ATTACHMENT` si no hay `FILE_ENCRYPTION_KEY` ni `KMS_KEY_ID`
- `PatientDocument` en schema: campos `encrypted`, `contentHash`, `encDataKey`, `encDataKeyIv`, `encDataKeyTag`, `iv`, `tag`
- Download descifra en memoria temporal antes de servir al usuario

**Derechos del titular (Data Subject Requests) — implementado:**
- Módulo completo: `backend/src/modules/data-subject-requests/`
- Tipos: `ACCESS`, `RECTIFICATION`, `REVOCATION`, `OPPOSITION`, `EXPORT`
- Estados: `PENDING`, `RESOLVED`, `REJECTED`, `CLOSED`
- E2e: `backend/test/data-subject-requests.e2e-spec.ts`

**Trazabilidad exhaustiva — implementada:**
- `LOGOUT`, `LOGIN_FAILED`, `ACCESS_DENIED`, `ERROR`, `CONSENT_CREATED`, `CONSENT_REVOKED`, `DOCUMENT_DOWNLOAD` en enum `AuditAction`
- `audit.interceptor.ts` captura 401 y 403 explícitamente
- `auth.controller.ts` registra `LOGOUT` antes de limpiar cookie
- Inmutabilidad DB: dos capas — trigger `BEFORE UPDATE OR DELETE` + `REVOKE UPDATE, DELETE FROM PUBLIC`

**CSRF — implementado:**
- `backend/src/common/middleware/csrf-token.middleware.ts`: double-submit cookie (`umbral_csrf_token` + header `X-CSRF-Token`)
- Exento: login y verificación MFA (bootstrap)
- Frontend: interceptor axios incluye CSRF token en todas las mutaciones

### Estado del addendum anterior (2026-06-03):
Todo lo indicado en el addendum 2026-06-03 sigue vigente y además se amplía con los controles KMS, CSRF y derechos del titular descritos arriba.

### Progreso del endurecimiento legal recalculado: **~83%**

| Frente | Peso | Progreso | Puntos |
|--------|------|----------|--------|
| A. Consentimiento trazable | Crítico (×4) | 100% | 400 |
| B. Protección documentos clínicos | Crítico (×4) | 90% | 360 |
| C. Protección backups | Alto (×3) | 95% | 285 |
| D. Derechos del titular | Alto (×3) | 85% | 255 |
| E. Trazabilidad exhaustiva | Alto (×3) | 90% | 270 |
| F. Custodia legal técnica | Medio (×2) | 30% | 60 |
| G. Seguridad sesión e incidentes | Medio (×2) | 90% | 180 |
| H. Evidencia operativa despliegue | Bajo (×1) | 20% | 20 |
| **Total ponderado** | | **~83%** | **1830/2200** |

El repositorio **no acredita cumplimiento estricto integral** con las exigencias legales aplicables, pero ha avanzado de manera sustantiva. Los frentes pendientes críticos son: custodia técnica con retención a 15 años (F) y evidencia operativa de despliegue (H).

### Conclusión general

- **Estado técnico general:** sólido y sustancialmente mejorado en autenticación, control de acceso, trazabilidad y consistencia operativa.
- **Estado de cumplimiento legal estricto:** **parcial e insuficiente para declararlo plenamente conforme**.
- **Hallazgo central:** el sistema ya protege mejor el acceso y la sesión, pero aún no demuestra de forma suficiente consentimiento jurídicamente trazable, resguardo criptográfico de documentos y respaldos, mecanismos de derechos del titular ni políticas técnicas equivalentes a custodia legal estricta.

### Determinación resumida

- **Ley 20.584:** cumplimiento técnico **parcial**. Hay mejoras reales en acceso, trazabilidad y ficha clínica, pero no evidencia suficiente de custodia estricta integral ni de gestión probatoria completa de consentimientos.
- **Ley 19.628:** cumplimiento técnico **parcial**. Existen medidas de seguridad y minimización relevantes, pero faltan controles explícitos para ejercicio de derechos, seguridad reforzada de datos sensibles y gobierno de tratamiento.
- **Ley 21.719:** **no acreditado estrictamente** desde el repo. El proyecto no demuestra todavía un nivel suficiente de accountability, derechos del titular, gestión de incidentes, resguardo criptográfico y base documental para declararse alineado con un estándar reforzado próximo a entrar en vigor.

---

## 2. Evidencia Positiva Verificada

Los siguientes controles sí constan en el repositorio y mejoran materialmente el perfil de cumplimiento:

1. **Control de acceso por paciente y rol** sobre ficha clínica, consultas, documentos y reportes, visible en [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L112-L132), [documents.service.ts](../backend/src/modules/documents/documents.service.ts#L12-L58) y [reports.service.ts](../backend/src/modules/reports/reports.service.ts#L9-L27).
2. **Sesión endurecida con cookie `httpOnly`** y restauración vía `/auth/me`, visible en [auth.controller.ts](../backend/src/modules/auth/auth.controller.ts#L21-L33), [client.ts](../frontend/src/api/client.ts#L6-L13) y [AuthContext.tsx](../frontend/src/context/AuthContext.tsx#L50-L58).
3. **Auditoría enriquecida e inmutable por diseño de aplicación y base de datos**, con `correlationId`, `statusCode`, triggers DB de inmutabilidad y eventos relevantes, visible en [audit.interceptor.ts](../backend/src/common/interceptors/audit.interceptor.ts#L16-L68) y [audit.service.ts](../backend/src/modules/audit/audit.service.ts#L16-L34).
4. **Versionado legal de correcciones clínicas con motivo obligatorio**, visible en [consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts#L122-L229).
5. **Consentimiento funcional exigido para registrar consultas**, visible en [consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts#L32-L61).
6. **Neutralización de la consulta pública por RUT**, visible en [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L214-L239).
7. **Soft delete y trazabilidad de cambios en pacientes**, visible en [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L140-L208).
8. **Validación ejecutable actual limpia:** Prisma al día, backend compilando, pruebas unitarias verdes, e2e ampliadas y frontend compilando correctamente.
9. **Consentimiento trazable endurecido:** el consentimiento queda vinculado a `PatientDocument` por `documentId`, deriva `textHash` desde el PDF subido, rechaza `metadata` adicional y cuenta con e2e HTTP de registro/listado/revocación.
10. **Archivos compartidos con cobertura HTTP:** el controlador de `shared-files` cuenta con e2e de subida, listado y descarga, incluyendo auditoría de creación y visualización.
11. **Cifrado de documentos clínicos con AWS KMS (envelope encryption):** `DocumentsService` exige cifrado para `PATIENT_REPORT` y `CONSULTATION_ATTACHMENT`. Usa AES-256-GCM con data key generada por KMS (`kms:GenerateDataKey`). Fallback a clave local (`FILE_ENCRYPTION_KEY`). Clave KMS activa: `arn:aws:kms:sa-east-1:505718059430:key/2c56ab46-dc28-4992-a9a9-cec3c20f4683`.
12. **Políticas IAM mínimas para KMS:** `kms-app-policy.json` (solo `GenerateDataKey`+`Decrypt`), `kms-admin-policy.json` (administración), `trust-policy.json`.
13. **Derechos del titular implementados:** módulo `data-subject-requests` con tipos `ACCESS`, `RECTIFICATION`, `REVOCATION`, `OPPOSITION`, `EXPORT` y flujo PENDING → RESOLVED/REJECTED/CLOSED con nota de resolución auditada.
14. **CSRF por doble token:** middleware `csrf-token.middleware.ts` valida cookie `umbral_csrf_token` contra header `X-CSRF-Token` en todas las mutaciones. Frontend envía token automáticamente via interceptor Axios.
15. **Eventos de auditoría exhaustivos:** `LOGOUT`, `LOGIN_FAILED`, `ACCESS_DENIED`, `ERROR`, `CONSENT_CREATED`, `CONSENT_REVOKED`, `DOCUMENT_DOWNLOAD` implementados en interceptor y servicios.

Estas mejoras son sustantivas y elevan el perfil de cumplimiento significativamente.

---

## 3. Hallazgos

## Críticos

### 3.1. El modelo de consentimiento no entrega evidencia jurídica ni trazabilidad suficiente

- **Estado actualizado 2026-06-03:** esta brecha quedó remediada en el workspace. El consentimiento ya no depende de un booleano ni de texto libre; ahora exige `documentId`, deriva evidencia desde el PDF asociado y queda visible en la ficha.

- **Riesgo:** crítico
- **Impacto:** el sistema no demuestra con suficiente solidez cuándo, cómo, bajo qué texto/versionado y con qué revocación se obtuvo el consentimiento para tratamiento de datos sensibles y atenciones específicas.

**Evidencia técnica**

- El modelo principal sólo persiste banderas booleanas de consentimiento en [schema.prisma](../backend/prisma/schema.prisma#L60-L62).
- Los documentos asociados al paciente sólo guardan metadatos de archivo y ruta en [schema.prisma](../backend/prisma/schema.prisma#L77-L79).
- El PDF clínico sólo muestra el estado “Firmado/Pendiente” en [reports.service.ts](../backend/src/modules/reports/reports.service.ts#L89-L90).

**Brecha estricta**

No existe evidencia en el modelo ni en servicios de:

- versión del texto de consentimiento,
- fecha/hora jurídica de firma,
- firmante o representante,
- medio de otorgamiento,
- revocación o retiro de consentimiento,
- alcance/finalidad específica,
- base legal trazable por tratamiento.

**Conclusión**

Desde una lectura estricta de Ley 20.584 y de un estándar reforzado de protección de datos sensibles, esta brecha impide declarar cumplimiento robusto del consentimiento informado y del tratamiento legítimo y trazable de datos de salud.

---

### 3.2. El resguardo de documentos clínicos y respaldos no demuestra protección estricta de datos sensibles

- **Estado actualizado 2026-06-05:** esta brecha quedó **remediada** en el workspace.
  - Documentos clínicos: cifrado envelope AES-256-GCM con KMS (prioridad) o clave local. El servicio rechaza uploads de documentos clínicos si no hay clave configurada. Download descifra temporalmente en memoria.
  - Backups: `backup.sh` cifra con `openssl enc -aes-256-cbc -pbkdf2`, genera SHA-256 checksum y manifest, copia a SSD secundario.
  - `verify-backup.ts` valida checksum e integridad del backup más reciente.
  - **Brecha menor remanente:** backup usa AES-CBC (no GCM), lo que proporciona confidencialidad pero no autenticación integrada. La integridad se verifica vía SHA-256 externo. Considera migrar a AES-GCM o usar KMS para backups también.

- **Riesgo residual:** bajo dentro del workspace. Pendiente: configuración de S3 como backend primario de almacenamiento de objetos.

---

## Altos

### 3.3. No existe evidencia suficiente de mecanismos de derechos del titular de datos

- **Estado actualizado 2026-06-05:** esta brecha quedó **remediada** en el workspace.
  - Módulo `data-subject-requests` implementado con tipos `ACCESS`, `RECTIFICATION`, `REVOCATION`, `OPPOSITION`, `EXPORT`.
  - Estados: `PENDING` → `RESOLVED` / `REJECTED` / `CLOSED`.
  - Resolución exige `resolutionNote`; registra `resolvedAt` y `resolvedBy`.
  - Auditoría de creación y resolución registrada en `AuditLog`.
  - E2e: `backend/test/data-subject-requests.e2e-spec.ts`.

- **Brecha remanente:** el tipo `EXPORT` no tiene automatización de exportación de datos; es un registro manual que debe resolverse operativamente. No hay plantillas formales de respuesta al titular ni SLA definidos.

---

### 3.4. La trazabilidad es fuerte pero no completamente exhaustiva para una exigencia legal estricta

- **Estado actualizado 2026-06-05:** brecha **sustancialmente reducida**.
  - `LOGOUT` registrado explícitamente en `auth.controller.ts` antes de limpiar cookie.
  - `LOGIN_FAILED` auditado en `auth.service.ts`.
  - `ACCESS_DENIED` (403) y `ERROR` capturados en `audit.interceptor.ts`.
  - `CONSENT_CREATED`, `CONSENT_REVOKED`, `DOCUMENT_UPLOAD`, `DOCUMENT_DOWNLOAD` en enum y emitidos.
  - Inmutabilidad DB: trigger `BEFORE UPDATE OR DELETE` + `REVOKE UPDATE, DELETE FROM PUBLIC`.

- **Brecha remanente (alto):** falta auditoría de eventos administrativos de alto impacto (cambios de rol, baja/reactivación de usuarios, cambios masivos). No hay catálogo formal de eventos con semántica estable documentada.

---

### 3.5. La custodia legal se declara, pero no se implementa como política técnica verificable

- **Riesgo:** alto
- **Impacto:** existe diferencia entre la afirmación documental y el enforcement técnico.

**Evidencia técnica**

- El PDF incluye la leyenda “Ley 20.584 — Custodia obligatoria 15 años” en [reports.service.ts](../backend/src/modules/reports/reports.service.ts#L157-L157).
- No se observa una política técnica de retención, archivo, congelamiento o preservación probatoria equivalente para ficha clínica, documentos ni historiales.
- El backup operativo maneja retención de 30 días en [backup.sh](../backups/backup.sh#L27-L27) y [backup.sh](../backups/backup.sh#L52-L54).

**Conclusión**

La custodia aparece como declaración documental, pero no como control técnico integral verificable en el repo.

---

## Medios

### 3.6. La seguridad de sesión mejoró, pero no acredita todavía un esquema integral de defensa complementaria

- **Estado actualizado 2026-06-05:** brecha **sustancialmente reducida**.
  - CSRF implementado via double-submit cookie (`umbral_csrf_token` + header `X-CSRF-Token`).
  - `LOGOUT` auditado.
  - Runbook de incidente de seguridad creado en `runbooks/security-incident.md`.
  - Cookie `httpOnly` + `SameSite=Lax`.

- **Brecha remanente (medio):** no hay política documentada de expiración/rotación de sesión concurrente ni de revocación masiva por incidente. El runbook de incidentes existe pero no está "probado" con ejercicio documentado.

---

### 3.7. Los documentos de optimización interna sobrestiman el grado de cumplimiento regulatorio si se leen como equivalentes legales

- **Riesgo:** medio
- **Impacto:** existe riesgo de interpretación excesiva de un “100% técnico” como si equivaliera a conformidad legal estricta.

**Evidencia técnica**

- El informe técnico consolidado declara cierre técnico del 100% dentro del workspace en [informe_tecnico.MD](./informe_tecnico.MD).
- Ese cierre sí está respaldado a nivel de código y validación local, pero no cubre consentimiento jurídicamente trazable, cifrado documental, derechos del titular, gobierno organizacional ni incidentes.

**Conclusión**

El informe técnico es válido como cierre de remediación técnica del roadmap interno, pero no debe usarse como afirmación de cumplimiento legal estricto sin este complemento de auditoría normativo-técnica.

---

## 4. Matriz de Cumplimiento por Frente Normativo (actualizada 2026-06-05)

| Frente | Estado | Evidencia positiva | Brecha remanente |
| --- | --- | --- | --- |
| Confidencialidad de ficha clínica | Alto | Control de acceso por paciente y rol; cifrado documentos clínicos con KMS | S3 como backend primario no configurado |
| Consentimiento informado | Acreditado | Entidad Consent con documentId, textHash, tipo, versión, método, revocación. E2e. | Versionar texto legal del consentimiento en el sistema |
| Trazabilidad de accesos y cambios | Alto | LOGOUT, LOGIN_FAILED, ACCESS_DENIED, DOCUMENT_DOWNLOAD, CONSENT* implementados. Triggers DB. | Eventos administrativos (cambio de rol) no auditados |
| Custodia de ficha clínica | Parcial bajo | Soft delete, historial, versionado, pie legal en PDF | Sin enforcement técnico de retención a 15 años |
| Minimización de exposición pública | Acreditado | Endpoint público por RUT neutralizado | — |
| Seguridad de autenticación y sesión | Alto | Cookie `httpOnly`, MFA, CSRF double-submit, LOGOUT auditado, runbook incidentes | Política de rotación/revocación masiva no documentada |
| Derechos del titular de datos | Acreditado en workspace | Módulo data-subject-requests: ACCESS, RECTIFICATION, REVOCATION, OPPOSITION, EXPORT | Automatización de EXPORT; plantillas de respuesta; SLA |
| Protección documentos clínicos | Alto | Envelope encryption AES-256-GCM con AWS KMS; contentHash; descifrado temporal | S3 como backend primario |
| Protección backups | Alto | Cifrado AES-256-CBC + SHA-256 checksum + manifest + SSD secundario + verify-backup | Migrar backup a AES-GCM o KMS para integridad autenticada |

---

## 5. Remediaciones Prioritarias Recomendadas

### Prioridad 1

- Modelar consentimientos como entidad trazable: versión, finalidad, firmante, fecha/hora, medio, estado, revocación y evidencia documental asociada.
- Cifrar respaldos y definir manejo de claves por entorno.
- Diseñar almacenamiento seguro de documentos clínicos con evidencia clara de protección en reposo.

### Prioridad 2

- Incorporar flujos técnicos para derechos del titular: acceso, rectificación trazada, revocación, oposición/bloqueo y exportación estructurada cuando corresponda.
- Registrar explícitamente `LOGOUT` y eventos críticos adicionales en auditoría.
- Separar con mayor claridad datos clínicos, datos administrativos y artefactos compartidos no clínicos.

### Prioridad 3

- Documentar política técnica de custodia y conservación compatible con las obligaciones legales aplicables.
- Agregar runbooks de incidente de seguridad y de tratamiento de eventos sobre datos sensibles.
- Revisar despliegues externos para verificar que las garantías locales se sostienen en Render, Vercel y Supabase.

---

## 6. Conclusión Final (actualizada 2026-06-05)

**El repositorio demuestra una mejora técnica sustantiva y múltiples controles de seguridad implementados que no estaban documentados.** El nivel de endurecimiento legal alcanzado es **~83% ponderado** sobre los frentes críticos identificados.

La conclusión correcta, desde una auditoría estricta al 2026-06-05, es:

- **cumplimiento técnico mejorado:** sí, sustancialmente.
- **cierre del roadmap interno de remediación técnica:** sí, incluyendo KMS, CSRF, derechos del titular, trazabilidad exhaustiva y backups cifrados.
- **cumplimiento legal estricto plenamente acreditado:** no aún. Faltan dos frentes:
  - **Frente F (Custodia legal técnica):** enforcement de retención a 15 años para ficha clínica, sin solución técnica implementada hoy.
  - **Frente H (Evidencia operativa de despliegue):** no aplica aún (prod es independiente del workspace actual).

El siguiente paso correcto para cerrar el cumplimiento es implementar una política técnica de conservación de datos clínicos (modelo de estado de archivo, bloqueo de eliminación para registros dentro del plazo legal) y documentar el catálogo de eventos de auditoría.