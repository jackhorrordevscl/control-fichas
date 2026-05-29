# Auditoría Estricta de Cumplimiento Legal

**Proyecto:** Control Fichas Clínicas / Umbral SpA  
**Fecha:** 24-05-2026  
**Alcance:** repositorio actual, validaciones ejecutables locales y documentación interna  
**Marco considerado:** Ley 20.584, Ley 19.628 y exigencias técnicas esperables del marco reforzado de protección de datos asociado a Ley 21.719  
**Naturaleza del documento:** auditoría técnico-normativa. No reemplaza informe jurídico formal ni evaluación organizacional externa.

---

## 1. Dictamen Ejecutivo

El repositorio **no acredita cumplimiento estricto integral** con las exigencias legales aplicables al tratamiento de ficha clínica y datos personales sensibles de salud.

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
3. **Auditoría enriquecida e inmutable por diseño de aplicación**, con `correlationId`, `statusCode` y eventos relevantes, visible en [audit.interceptor.ts](../backend/src/common/interceptors/audit.interceptor.ts#L16-L68) y [audit.service.ts](../backend/src/modules/audit/audit.service.ts#L16-L34).
4. **Versionado legal de correcciones clínicas con motivo obligatorio**, visible en [consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts#L122-L229).
5. **Consentimiento funcional exigido para registrar consultas**, visible en [consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts#L32-L61).
6. **Neutralización de la consulta pública por RUT**, visible en [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L214-L239).
7. **Soft delete y trazabilidad de cambios en pacientes**, visible en [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L140-L208).
8. **Validación ejecutable actual limpia:** Prisma al día, backend compilando, 26 pruebas unitarias verdes, 4 e2e verdes y frontend compilando correctamente.

Estas mejoras son sustantivas, pero no bastan por sí solas para sostener una declaración de cumplimiento legal estricto.

---

## 3. Hallazgos

## Críticos

### 3.1. El modelo de consentimiento no entrega evidencia jurídica ni trazabilidad suficiente

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

- **Riesgo:** crítico
- **Impacto:** hay exposición operativa relevante si el almacenamiento subyacente o el host se ven comprometidos.

**Evidencia técnica**

- Los documentos clínicos se almacenan y recuperan desde rutas de disco mediante `storagePath` y descarga directa en [schema.prisma](../backend/prisma/schema.prisma#L77-L79), [documents.service.ts](../backend/src/modules/documents/documents.service.ts#L21-L28) y [documents.controller.ts](../backend/src/modules/documents/documents.controller.ts#L76-L87).
- El repositorio compartido también sirve archivos desde path físico en [shared-files.controller.ts](../backend/src/shared-files/shared-files.controller.ts#L49-L61).
- El backup se genera con `pg_dump` y `gzip` en [backup.sh](../backups/backup.sh#L34-L45), con borrado por antigüedad en [backup.sh](../backups/backup.sh#L52-L54).

**Brecha estricta**

No hay evidencia en el repo de:

- cifrado en reposo de documentos clínicos gestionado por la aplicación,
- cifrado de backups antes de su almacenamiento o traslado,
- gestión de claves,
- segregación criptográfica por entorno,
- clasificación y protección específica de adjuntos clínicos sensibles.

**Conclusión**

Para tratamiento estricto de datos de salud, el estado actual no acredita medidas técnicas suficientes de protección fuerte sobre documentos y respaldos.

---

## Altos

### 3.3. No existe evidencia suficiente de mecanismos de derechos del titular de datos

- **Riesgo:** alto
- **Impacto:** el repo no demuestra cómo se atienden solicitudes de acceso, rectificación, oposición, revocación, bloqueo, supresión lógica compatible con custodia o portabilidad.

**Evidencia técnica**

- La superficie funcional visible de pacientes se concentra en CRUD, historial y soft delete en [patients.controller.ts](../backend/src/modules/patients/patients.controller.ts#L19-L69) y [patients.service.ts](../backend/src/modules/patients/patients.service.ts#L195-L208).
- No aparece evidencia específica en código de flujos dedicados para derechos del titular ni de gestión formal de solicitudes.

**Brecha estricta**

Soft delete no equivale a un régimen legal completo de derechos del titular. Tampoco se evidencia bloqueo, separación lógica de conservación legal, exportación estructurada para el titular o trazabilidad de solicitudes y resoluciones.

**Conclusión**

Bajo una revisión estricta, el repositorio no acredita cumplimiento suficiente en este frente.

---

### 3.4. La trazabilidad es fuerte pero no completamente exhaustiva para una exigencia legal estricta

- **Riesgo:** alto
- **Impacto:** quedan huecos en rendición de cuentas sobre eventos de sesión y accesos.

**Evidencia técnica**

- El interceptor global no registra requests sin usuario autenticado y sólo audita respuestas exitosas en [audit.interceptor.ts](../backend/src/common/interceptors/audit.interceptor.ts#L16-L21).
- El enum de auditoría contempla `LOGOUT` en [schema.prisma](../backend/prisma/schema.prisma#L136-L144).
- El endpoint de cierre de sesión existe en [auth.controller.ts](../backend/src/modules/auth/auth.controller.ts#L82-L85), pero no hay evidencia de registro explícito de `LOGOUT`.

**Brecha estricta**

Para cumplimiento fuerte de accountability faltaría, al menos, evidencia de registro completo de cierre de sesión, eventos administrativos críticos, intentos relevantes de acceso denegado por recurso y trazabilidad más completa de accesos a archivos.

**Conclusión**

La trazabilidad mejoró notablemente, pero todavía no puede considerarse exhaustiva en un estándar legal estricto.

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

- **Riesgo:** medio
- **Impacto:** la autenticación es más segura que antes, pero el repositorio no demuestra por sí solo un régimen completo de protección de sesión para entornos expuestos.

**Evidencia técnica**

- Cookie `httpOnly` y `SameSite=Lax` en [auth.controller.ts](../backend/src/modules/auth/auth.controller.ts#L21-L27).
- Restauración de sesión y limpieza reactiva en [client.ts](../frontend/src/api/client.ts#L15-L29) y [AuthContext.tsx](../frontend/src/context/AuthContext.tsx#L61-L108).

**Brecha estricta**

No hay evidencia suficiente en el repo de:

- estrategia anti-CSRF dedicada,
- política explícita de rotación de sesión,
- revocación de tokens por incidente,
- gestión de sesiones concurrentes,
- gestión formal de eventos de seguridad o incidentes.

**Conclusión**

La autenticación actual es razonable y claramente superior al estado previo, pero no basta para afirmar cumplimiento estricto integral por sí sola.

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

## 4. Matriz de Cumplimiento por Frente Normativo

| Frente | Estado | Evidencia positiva | Brecha principal |
| --- | --- | --- | --- |
| Confidencialidad de ficha clínica | Parcial | Control de acceso por paciente y rol | Resguardo documental y de backup no acreditado estrictamente |
| Consentimiento informado | Parcial | Exigencia funcional para consultas y telemedicina | No hay consentimiento versionado, firmado, revocable y jurídicamente trazable |
| Trazabilidad de accesos y cambios | Parcial alto | Auditoría enriquecida, historial de cambios, versionado | Falta exhaustividad estricta en ciertos eventos y accountability completo |
| Custodia de ficha clínica | Parcial | Soft delete e historial, pie legal en PDF | No hay política técnica verificable de retención/custodia integral |
| Minimización de exposición pública | Alto | Endpoint público por RUT neutralizado | Correcto en este frente |
| Seguridad de autenticación y sesión | Alto | Cookie `httpOnly`, MFA opcional, `/auth/me`, logout | Falta evidencia de CSRF/rotación/incidentes |
| Derechos del titular de datos | Bajo/No acreditado | No hay evidencia suficiente | Faltan flujos y trazabilidad de ejercicio de derechos |
| Protección operativa de respaldos | Bajo/No acreditado | Backup automático y retención | No hay cifrado ni evidencia de protección fuerte |

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

## 6. Conclusión Final

**El repositorio sí demuestra una mejora técnica sustantiva y controles relevantes de seguridad, acceso y trazabilidad. Sin embargo, no entrega evidencia suficiente para afirmar cumplimiento legal estricto integral con Ley 20.584, Ley 19.628 y el estándar reforzado esperable bajo Ley 21.719.**

La conclusión correcta, desde una auditoría estricta, es:

- **cumplimiento técnico mejorado:** sí,
- **cierre del roadmap interno de remediación técnica:** sí,
- **cumplimiento legal estricto plenamente acreditado:** no.

El siguiente paso correcto no es presentar el proyecto como plenamente conforme, sino cerrar las brechas de consentimiento trazable, protección criptográfica, derechos del titular, custodia verificable y evidencia operativa fuera del workspace.