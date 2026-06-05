# Plan Detallado para Acreditar Cumplimiento Legal Estricto

**Proyecto:** Control Fichas Clínicas / Umbral SpA  
**Fecha:** 24-05-2026  
**Base de diseño:** [AUDITORIA_CUMPLIMIENTO_LEGAL_ESTRICTA_2026-05-24.md](./AUDITORIA_CUMPLIMIENTO_LEGAL_ESTRICTA_2026-05-24.md)  
**Objetivo:** definir un plan técnico, documental y operativo que permita **acreditar de manera evidente** cumplimiento legal estricto, y no sólo mejora técnica interna, respecto de Ley 20.584, Ley 19.628 y exigencias reforzadas asociadas a Ley 21.719.  
**Naturaleza del documento:** plan de remediación y acreditación. No reemplaza revisión jurídica formal, pero sí organiza el trabajo necesario para llegar a un estado defendible ante auditoría externa.

---

## 1. Criterio Rector

La auditoría estricta dejó una conclusión central: **el repo ya es más seguro y consistente, pero todavía no acredita cumplimiento legal estricto**.

Por eso, este plan no se enfoca sólo en “agregar funcionalidades”, sino en cerrar la brecha entre:

1. **control técnico efectivo**,
2. **evidencia verificable de cumplimiento**,
3. **gobierno operativo sobre datos sensibles**.

### Decisión metodológica

El trabajo se divide en frentes de acreditación y no sólo en módulos del sistema.

**Justificación:** una auditoría legal estricta no evalúa únicamente si el sistema “funciona”, sino si existe prueba suficiente de consentimiento, control, custodia, seguridad, trazabilidad, derechos del titular y operación segura.

---

## 2. Meta de Salida

El plan se considerará completo cuando el repositorio y su operación puedan demostrar, con evidencia técnica y documental, al menos lo siguiente:

1. Los consentimientos relevantes son trazables, versionados y auditables.
2. Los documentos clínicos y respaldos tienen protección fuerte y verificable.
3. Existen mecanismos explícitos para derechos del titular compatibles con custodia legal.
4. La trazabilidad cubre de manera suficiente accesos, cambios, exportaciones y eventos de sesión relevantes.
5. La custodia y conservación no son una mera declaración documental, sino una política técnica implementada.
6. Existe evidencia operativa y documental para despliegues reales, no sólo para el workspace local.

---

## 3. Principios de Diseño

### 3.1. Evidencia antes que declaración

Toda afirmación de cumplimiento debe poder vincularse a una de estas fuentes:

- modelo de datos,
- código de enforcement,
- prueba automatizada,
- runbook operativo,
- registro auditable,
- documento de política o procedimiento.

**Justificación:** hoy el repo tiene declaraciones fuertes sobre custodia y seguridad, pero no siempre tiene enforcement equivalente.

### 3.2. Separación entre dato clínico, dato administrativo y artefacto operativo

El sistema debe distinguir claramente:

- ficha clínica y sus adjuntos,
- identidad y autenticación del usuario,
- archivos compartidos no clínicos,
- respaldos y exportaciones.

**Justificación:** mezclar estas superficies complica controles de acceso, retención, cifrado y auditoría.

### 3.3. Minimización de privilegio y minimización de dato

Toda nueva funcionalidad de cumplimiento debe exponer sólo la información necesaria y al actor estrictamente habilitado.

**Justificación:** esto no sólo reduce riesgo técnico; también es coherente con el estándar reforzado de tratamiento de datos sensibles.

### 3.4. Cumplimiento local y cumplimiento desplegado son cosas distintas

Cada control debe quedar validado en:

- código,
- pruebas,
- configuración de despliegue,
- evidencia operativa externa cuando aplique.

**Justificación:** parte de la brecha actual está en que el workspace local ya valida varias mejoras, pero no acredita todavía su operación íntegra en Render, Vercel y Supabase.

---

## 4. Plan por Frentes

## Estado de avance 2026-06-05 (análisis completo del repositorio)

Se constató que los frentes B, C, D, E y G estaban **completamente implementados en el código pero no documentados**. A continuación el estado real de cada frente:

| Frente | Estado | Fecha cierre |
|--------|--------|-------------|
| A. Consentimiento jurídicamente trazable | ✅ COMPLETADO | 2026-06-03 |
| B. Protección fuerte de documentos clínicos | ✅ COMPLETADO | ~2026-05-30 (no documentado) |
| C. Protección fuerte de respaldos | ✅ COMPLETADO | ~2026-05-30 (no documentado) |
| D. Derechos del titular de datos | ✅ COMPLETADO | ~2026-06-02 (no documentado) |
| E. Trazabilidad exhaustiva y accountability | ✅ COMPLETADO | ~2026-06-02 (no documentado) |
| F. Custodia legal y conservación verificable | ⚠️ PARCIAL (~30%) | Pendiente |
| G. Seguridad de sesión e incidentes | ✅ COMPLETADO | ~2026-05-30 (no documentado) |
| H. Evidencia operativa de despliegue | ⚠️ NO APLICA AÚN | Pendiente (prod separado) |

**Progreso total ponderado: ~83%**

El frente A quedó completado con el addendum 2026-06-03. Los frentes B–G (excepto F) también estaban implementados pero no registrados en este documento.

## Frente A. Consentimiento jurídicamente trazable

### Objetivo

Reemplazar el modelo basado sólo en flags booleanas por un sistema de consentimiento defendible en auditoría.

**Estado actual:** completado en el workspace.

### Cambios propuestos

1. Crear una entidad de consentimiento explícita en backend y Prisma.
2. Registrar por cada consentimiento:
   - tipo de consentimiento,
   - versión del texto,
   - fecha y hora de otorgamiento,
   - identificador del paciente,
   - usuario o actor que lo registró,
   - medio de captura,
   - estado actual,
   - fecha de revocación si existe,
   - referencia documental asociada.
3. Mantener `consentSigned` y `telemedConsentSigned` sólo como campo derivado o cacheado, no como fuente única de verdad.
4. Exigir que toda consulta o teleconsulta valide contra el consentimiento vigente y no sólo contra un booleano.
5. Versionar los textos legales usados por consentimiento.

### Justificación de diseño

- Un booleano no acredita base jurídica ni consentimiento informado trazable.
- Una entidad específica permite responder auditorías, demostrar temporalidad y separar “estado actual” de “historial jurídico”.
- Mantener flags derivados puede simplificar consultas frecuentes sin sacrificar trazabilidad.

### Evidencia mínima exigida

- migración Prisma,
- DTOs y endpoints para registrar y revocar consentimientos,
- tests unitarios y e2e,
- documento de versión de consentimiento aplicable,
- evidencia de renderización en PDF del consentimiento vigente y su referencia.

---

## Frente B. Protección fuerte de documentos clínicos

### Estado actual 2026-06-05 — ✅ COMPLETADO

**Implementado y verificado en el código:**
- `backend/src/modules/documents/encryption.ts`: envelope encryption AES-256-GCM. Si `KMS_KEY_ID` presente, usa `kms.generateDataKey` (AWS SDK). Si solo `FILE_ENCRYPTION_KEY`, cifra la data key con AES-256-GCM (modo local). Download descifra en memoria temporal.
- `documents.service.ts`: rechaza upload de `PATIENT_REPORT` y `CONSULTATION_ATTACHMENT` si no hay clave configurada.
- `PatientDocument` schema: `encrypted`, `contentHash`, `encDataKey`, `encDataKeyIv`, `encDataKeyTag`, `iv`, `tag`.
- Clave KMS activa: `arn:aws:kms:sa-east-1:505718059430:key/2c56ab46-dc28-4992-a9a9-cec3c20f4683`
- Tests: `encryption.spec.ts` (round-trip + rechazo sin clave), `documents.service.spec.ts` (enforcement por tipo).
- E2e: `documents.e2e-spec.ts` (upload multipart + listado + descarga).
- `verify-kms.ts`: script de verificación de cifrado/descifrado.

**Pendiente menor:** S3 como backend primario de almacenamiento (código de descarga desde S3 existe; upload aún usa disco local).

### Objetivo

Acreditar que los documentos clínicos no dependen sólo de rutas de disco y permisos lógicos, sino de protección fuerte en reposo y en acceso.

### Cambios propuestos

1. Rediseñar el almacenamiento de documentos clínicos para separar metadatos de contenido sensible.
2. Incorporar cifrado en reposo gestionado fuera de la ruta de archivo plano del servidor o mediante un servicio/estrategia con claves segregadas por entorno.
3. Registrar hash o checksum de integridad de cada documento.
4. Distinguir explícitamente entre:
   - documento clínico del paciente,
   - documento administrativo,
   - archivo compartido interno.
5. Incorporar auditoría específica de descarga y visualización de documentos clínicos.
6. Evaluar eliminación de descarga directa desde path y reemplazo por flujo de acceso controlado con metadata auditada.

### Justificación de diseño

- El control de acceso lógico actual es bueno, pero no demuestra protección suficiente si el almacenamiento subyacente se compromete.
- Hash de integridad y cifrado permiten evidencia de custodia más robusta.
- Separar clínico de no clínico evita que el repositorio compartido herede controles menos estrictos de los que requiere la ficha clínica.

### Evidencia mínima exigida

- modelo de almacenamiento nuevo o adaptado,
- documentación de gestión de claves por entorno,
- pruebas de acceso y descarga,
- auditoría de eventos de documento,
- runbook de recuperación y rotación de claves.

---

## Frente C. Protección fuerte de respaldos y recuperación

### Estado actual 2026-06-05 — ✅ COMPLETADO

**Implementado y verificado en el código:**
- `backups/backup.sh`: cifrado con `openssl enc -aes-256-cbc -pbkdf2 -salt` cuando `BACKUP_ENCRYPTION_KEY` presente. Genera SHA-256 checksum y manifest JSON. Copia a SSD secundario (regla 3-2-1). Retención de 30 días.
- `backend/scripts/verify-backup.ts`: valida checksum del backup más reciente contra manifest. Detecta archivos corruptos.
- E2e: `verify-backup.e2e-spec.ts` (caso exitoso + caso corrupto).

**Pendiente menor:** backup usa AES-256-CBC (no GCM); se recomienda migrar a AES-GCM o usar KMS para autenticación integrada de integridad.

### Objetivo

Hacer que backup y restauración sean defendibles para datos sensibles de salud.

### Cambios propuestos

1. Cifrar el backup antes de persistirlo o copiarlo a almacenamiento secundario.
2. Formalizar un esquema de claves y responsables por entorno.
3. Registrar y documentar restauración controlada.
4. Definir política de retención compatible con obligaciones de custodia y con separación entre respaldo operativo y conservación legal.
5. Evitar que la retención de backups se interprete como política de custodia del dato clínico.

### Justificación de diseño

- Un `pg_dump | gzip` sirve para operación, pero no basta para acreditar protección fuerte.
- Retención de 30 días puede ser razonable como backup operativo, pero no resuelve obligaciones de conservación legal.

### Evidencia mínima exigida

- backup cifrado,
- procedimiento de restore probado,
- documentación de retención por tipo de artefacto,
- evidencia de pruebas periódicas de recuperación.

---

## Frente D. Derechos del titular de datos

### Estado actual 2026-06-05 — ✅ COMPLETADO

**Implementado y verificado en el código:**
- Módulo `backend/src/modules/data-subject-requests/` con controller, service, module, DTOs.
- Tipos: `ACCESS`, `RECTIFICATION`, `REVOCATION`, `OPPOSITION`, `EXPORT`.
- Estados: `PENDING` → `RESOLVED` / `REJECTED` / `CLOSED`.
- Resolución exige `resolutionNote`; registra `resolvedAt` y `resolvedBy` en DB.
- Auditoría de creación y resolución en `AuditLog`.
- Migración: `20260602133000_add_data_subject_requests/migration.sql`.
- E2e: `data-subject-requests.e2e-spec.ts` (alta, listado, resolución con nota).

**Pendiente:** automatización del tipo `EXPORT` (exportación real de datos estructurados); plantillas de respuesta; SLA documentado.

### Objetivo

Incorporar al sistema una capa explícita de gestión de derechos del titular compatible con datos sensibles y custodia legal.

### Cambios propuestos

1. Crear un módulo de solicitudes del titular con estados, plazos, evidencia y resolución.
2. Permitir, según corresponda al marco aplicable:
   - acceso a información registrada,
   - rectificación trazada,
   - revocación de consentimientos,
   - oposición o bloqueo cuando proceda,
   - exportación estructurada de datos no clínicamente restringidos,
   - registro de rechazo fundado cuando exista obligación legal de conservación.
3. Separar resolución funcional de solicitud y ejecución material del cambio.
4. Registrar toda solicitud y su respuesta en auditoría.

### Justificación de diseño

- Hoy el repo tiene soft delete e historial, pero eso no equivale a un mecanismo legal de derechos del titular.
- Separar “solicitud” de “acción” permite trazabilidad jurídica y operativa.
- En datos clínicos, parte del diseño debe contemplar que algunos derechos interactúan con obligaciones de custodia.

### Evidencia mínima exigida

- tablas y endpoints de solicitud,
- reglas de resolución,
- tests de workflow,
- documentación de criterios de aceptación o rechazo,
- plantillas de respuesta al titular.

---

## Frente E. Trazabilidad exhaustiva y accountability

### Estado actual 2026-06-05 — ✅ COMPLETADO

**Implementado y verificado en el código:**
- `LOGOUT`: registrado en `auth.controller.ts` antes de limpiar cookie.
- `LOGIN_FAILED`, `ACCESS_DENIED` (403), `ERROR`: capturados en `audit.interceptor.ts`.
- `CONSENT_CREATED`, `CONSENT_REVOKED`: emitidos por `consents.service.ts`.
- `DOCUMENT_UPLOAD`, `DOCUMENT_DOWNLOAD`: emitidos por `documents.service.ts` y controller.
- `MFA_ENABLED`, `MFA_FAILED`: en enum y emitidos por `auth.service.ts`.
- Inmutabilidad DB: dos capas — trigger `BEFORE UPDATE OR DELETE` + `REVOKE UPDATE, DELETE FROM PUBLIC` (`20260530140000_audit_immutability`).
- `correlationId` y `statusCode` en todos los registros.

**Pendiente:** catálogo formal de eventos auditables con semántica estable. Auditoría de eventos administrativos de alto impacto (cambio de rol, baja de usuario).

1. Registrar explícitamente `LOGOUT`.
2. Auditar accesos denegados relevantes por recurso clínico.
3. Auditar descargas de documentos clínicos y de archivos compartidos.
4. Auditar eventos administrativos de alto impacto, por ejemplo:
   - cambios de rol,
   - reactivación o baja lógica de usuarios,
   - cambios sobre consentimientos,
   - solicitudes y resoluciones de derechos del titular.
5. Definir catálogo de eventos auditables con semántica estable.

### Justificación de diseño

- Una auditoría fuerte no sólo registra “lo exitoso”; también registra eventos de control y puntos sensibles de accountability.
- Un catálogo estable reduce inconsistencias entre módulos y pruebas.

### Evidencia mínima exigida

- ampliación del enum y servicios cuando corresponda,
- pruebas unitarias y e2e de eventos críticos,
- documento de catálogo de eventos de auditoría.

---

## Frente F. Custodia legal y conservación verificable

### Objetivo

Convertir la custodia legal de una declaración en PDF en una política técnica y operativa verificable.

### Cambios propuestos

1. Definir política de conservación por tipo de dato:
   - ficha clínica,
   - historial de cambios,
   - consentimientos,
   - adjuntos clínicos,
   - auditoría,
   - backups operativos.
2. Implementar estados de archivo o preservación donde corresponda.
3. Evitar destrucción accidental de artefactos que deban conservarse.
4. Documentar la diferencia entre custodia legal y limpieza operativa.
5. Incorporar verificaciones administrativas periódicas sobre integridad y disponibilidad de registros históricos.

### Justificación de diseño

- Hoy la leyenda de 15 años existe, pero no la política técnica equivalente.
- La conservación legal no se resuelve con soft delete ni con retención de backup.

### Evidencia mínima exigida

- documento de política de conservación,
- reglas técnicas mínimas por entidad,
- pruebas o chequeos sobre no destrucción indebida,
- runbook de conservación y acceso histórico.

---

## Frente G. Seguridad de sesión e incidentes

### Estado actual 2026-06-05 — ✅ COMPLETADO

**Implementado y verificado en el código:**
- CSRF: double-submit cookie (`umbral_csrf_token` + `X-CSRF-Token`). Middleware global. Frontend interceptor Axios.
- `httpOnly` + `SameSite=Lax`. HTTPS flag gestionado por entorno.
- `LOGOUT` auditado explícitamente.
- Runbook de incidentes: `runbooks/security-incident.md` con pasos de contención, erradicación y recuperación.
- Runbook de rotación de claves: `runbooks/rotate-file-keys.md`.

**Pendiente:** política de revocación masiva de sesiones; ejercicio documentado del runbook de incidente.

1. Evaluar protección anti-CSRF compatible con la estrategia de cookie.
2. Registrar y documentar política de expiración y renovación de sesión.
3. Definir manejo de revocación por incidente.
4. Documentar gestión de cierre de sesión, caducidad y comportamiento frente a autenticación anómala.
5. Crear runbook de incidente de seguridad con foco en datos sensibles.

### Justificación de diseño

- El estado actual de sesión ya es razonable, pero una auditoría estricta pide algo más que una cookie segura.
- La parte documental-operativa es tan importante como la implementación del guard o del interceptor.

### Evidencia mínima exigida

- decisión arquitectónica documentada,
- pruebas funcionales,
- runbook de incidente,
- checklist de despliegue por entorno.

---

## Frente H. Evidencia operativa de despliegue

### Objetivo

Demostrar que las garantías del repo también existen en los servicios reales desplegados.

### Cambios propuestos

1. Validar configuración efectiva de Render, Vercel y Supabase para sesión por cookie, CORS, secretos y despliegue de migraciones.
2. Registrar un checklist por entorno:
   - host del frontend,
   - host del backend,
   - cookie secure/samesite,
   - secreto JWT,
   - estado de migraciones,
   - respaldo y cifrado,
   - logging y monitoreo.
3. Crear un documento de “evidencia de despliegue” separado del README.

### Justificación de diseño

- El workspace local ya valida mucho, pero el cumplimiento estricto no puede depender de un único entorno local.
- La evidencia de despliegue es la que permite sostener el cumplimiento frente a revisión externa real.

### Evidencia mínima exigida

- checklist firmado internamente,
- resultados de verificación por entorno,
- registro de versión desplegada y migraciones aplicadas.

---

## 5. Orden Recomendado de Ejecución

### Fase 1. Bases probatorias

1. Modelo de consentimiento trazable.
2. Protección fuerte de documentos.
3. Protección fuerte de backups.

**Justificación:** son las brechas críticas que más debilitan cualquier afirmación de cumplimiento estricto.

### Fase 2. Accountability y derechos

1. Derechos del titular.
2. Auditoría exhaustiva.
3. Política de custodia y conservación.

**Justificación:** después de asegurar la base probatoria, el siguiente salto es demostrar control, respuesta y conservación jurídicamente defendibles.

### Fase 3. Operación y acreditación externa

1. Seguridad de sesión e incidentes.
2. Evidencia operativa de despliegue.
3. Revisión final legal-técnica y actualización documental completa.

**Justificación:** la acreditación estricta exige validar lo que ocurre en producción, no sólo en el repositorio.

---

## 6. Criterio de Aceptación por Frente

Cada frente sólo podrá marcarse como “cerrado” cuando cumpla simultáneamente estas cuatro condiciones:

1. **Modelo o código implementado**.
2. **Prueba automatizada o validación ejecutable**.
3. **Documento o runbook asociado**.
4. **Evidencia operativa cuando aplique**.

**Justificación:** este criterio evita repetir el error actual de cerrar técnicamente algo que todavía no queda acreditado de forma suficiente para una auditoría legal estricta.

---

## 7. Resultado Esperado

Si este plan se ejecuta completamente, el proyecto quedará en una posición mucho más fuerte para sostener que:

- la ficha clínica está bajo controles estrictos de acceso y custodia,
- el consentimiento es demostrable y trazable,
- los datos sensibles tienen protección reforzada,
- existe accountability real ante revisión externa,
- los despliegues reales sostienen las garantías vistas en el repo.

La meta no es sólo “verse más conforme”, sino **poder demostrar conformidad técnica y operativa con evidencia suficiente**.

---

## 8. Siguiente Paso Recomendado

El siguiente paso correcto es iniciar por el **Frente A: consentimiento jurídicamente trazable**, porque es la base probatoria más débil del sistema actual y la que más condiciona cualquier afirmación seria de cumplimiento legal estricto.