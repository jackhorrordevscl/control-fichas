# Auditoría Técnica y de Cumplimiento

**Proyecto:** Control Fichas Clínicas / Umbral SpA  
**Fecha de auditoría:** 22-05-2026  
**Base de análisis:** archivo [instrucciones.md](.github/instrucciones.md), código fuente backend/frontend, README, scripts de instalación y respaldo  
**Tipo de revisión:** técnica, funcional y de riesgo regulatorio  
**Alcance legal:** evaluación técnica orientada a cumplimiento; no reemplaza revisión jurídica formal

---

## 1. Resumen Ejecutivo

El proyecto está **funcionalmente avanzado**, pero **no tiene evidencia suficiente para declararse plenamente alineado** con los requisitos descritos en [instrucciones.md](.github/instrucciones.md) ni con un estándar razonable de resguardo de datos clínicos sensibles.

### Dictamen general

- **Estado técnico general:** funcional con deuda importante de seguridad y consistencia.
- **Estado de cumplimiento declarado vs. implementado:** **parcial**.
- **Riesgo principal:** acceso indebido a información clínica por controles incompletos sobre consultas, documentos y reportes.
- **Riesgo secundario:** varias capacidades existen en modelo/UI, pero fallan o quedan incompletas en la ruta real de backend.

### Conclusión operativa

Hoy el sistema **sí cubre parte importante del flujo clínico**, pero **no debería presentarse como cumplimiento robusto** de Ley 20.584 ni de exigencias de tratamiento seguro de datos sensibles asociadas al nuevo marco de protección de datos sin remediar primero los hallazgos críticos de acceso, trazabilidad, versionado y manejo de secretos.

---

## 2. Metodología Aplicada

Se revisó la implementación real en estos frentes:

1. **Modelo de datos Prisma** para verificar si el dominio soporta consentimiento, telemedicina, auditoría, historial y soft delete.
2. **Controladores y servicios backend** para validar si esas capacidades están efectivamente ejecutadas.
3. **Frontend** para contrastar lo que la UI promete con lo que backend permite o restringe.
4. **Scripts de instalación y backup** para revisar operación, cron, retención y exposición de secretos.
5. **Documentación del proyecto** para detectar diferencias entre lo declarado y lo implementado.
6. **Validación técnica acotada**:
   - Diagnósticos del editor: sin errores reportados.
   - Build frontend: exitoso.
   - Build backend: sin errores visibles durante compilación.

También se contrastó el análisis con lectura oficial disponible de Ley 20.584 en BCN. Para Ley 21.719 esta auditoría se enfoca en **controles técnicos esperables sobre datos sensibles de salud**: acceso mínimo necesario, trazabilidad, resguardo de secretos, minimización de exposición y seguridad operacional.

---

## 3. Hallazgos Prioritarios

## Críticos

### 3.1. Controles de acceso incompletos sobre recursos clínicos sensibles

**Estado:** crítico  
**Impacto:** cualquier usuario autenticado podría acceder o modificar recursos clínicos fuera de su ámbito si conoce IDs válidos.

**Evidencia:**

- [backend/src/modules/consultations/consultations.controller.ts](../backend/src/modules/consultations/consultations.controller.ts) expone consultas por paciente y por ID sin validar pertenencia.
- [backend/src/modules/consultations/consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts) no restringe lectura/corrección por terapeuta, coordinador o director.
- [backend/src/modules/reports/reports.controller.ts](../backend/src/modules/reports/reports.controller.ts) permite exportar PDF con solo JWT.
- [backend/src/modules/reports/reports.service.ts](../backend/src/modules/reports/reports.service.ts) genera ficha completa sin verificar si el solicitante puede verla.
- [backend/src/modules/documents/documents.controller.ts](../backend/src/modules/documents/documents.controller.ts) lista y descarga documentos sin control de ownership sobre paciente/documento.

**Determinación:** no existe principio de mínimo privilegio suficientemente aplicado para datos clínicos.

**Riesgo regulatorio:** alto para confidencialidad de ficha clínica y tratamiento de datos sensibles.

---

### 3.2. Desalineación `userId` vs `id` rompe flujos de seguridad y trazabilidad

**Estado:** crítico  
**Impacto:** MFA, documentos, archivos compartidos y soft delete de usuarios pueden fallar o comportarse de forma incorrecta en runtime.

**Evidencia:**

- [backend/src/modules/auth/strategies/jwt.strategy.ts](../backend/src/modules/auth/strategies/jwt.strategy.ts) retorna un usuario autenticado con propiedad `userId`.
- [backend/src/common/interfaces/authenticated-user.interface.ts](../backend/src/common/interfaces/authenticated-user.interface.ts) define `userId`, no `id`.
- [backend/src/modules/auth/auth.controller.ts](../backend/src/modules/auth/auth.controller.ts) usa `user.id` en rutas MFA.
- [backend/src/modules/documents/documents.controller.ts](../backend/src/modules/documents/documents.controller.ts) usa `user.id` al subir documentos.
- [backend/src/shared-files/shared-files.controller.ts](../backend/src/shared-files/shared-files.controller.ts) usa `req.user.id` en validaciones de acceso.
- [backend/src/modules/users/users.controller.ts](../backend/src/modules/users/users.controller.ts) usa `user.id` en soft delete.

**Determinación:** hay una inconsistencia estructural entre autenticación y consumo de identidad autenticada. El sistema parece correcto a nivel de tipos superficiales, pero tiene alta probabilidad de fallo en ejecución.

---

### 3.3. Exposición pública de datos por consulta de próxima sesión vía RUT

**Estado:** crítico  
**Impacto:** una ruta pública entrega nombre del paciente, terapeuta y próxima sesión a partir del RUT.

**Evidencia:**

- [backend/src/modules/patients/patients.controller.ts](../backend/src/modules/patients/patients.controller.ts) expone `GET /patients/public/next-session` sin autenticación.
- [backend/src/modules/patients/patients.service.ts](../backend/src/modules/patients/patients.service.ts) retorna `patientName`, `therapistName` y `nextSession`.

**Determinación:** esta ruta vulnera principios de minimización y confidencialidad para datos de salud y agenda clínica.

---

## Altos

### 3.4. La auditoría no es realmente inmutable a nivel de base de datos

**Estado:** alto  
**Impacto:** la bitácora es append-only por convención del servicio, no por restricción dura de almacenamiento.

**Evidencia:**

- [backend/src/modules/audit/audit.service.ts](../backend/src/modules/audit/audit.service.ts) sólo implementa `create`, pero no hay evidencia de restricción SQL, trigger o política que impida `update/delete` por fuera de la app.
- [backend/prisma/schema.prisma](../backend/prisma/schema.prisma) define `AuditLog`, pero no establece mecanismo de inmutabilidad a nivel DB.

**Adicionalmente falta:**

- No se guardan `correlationId` ni `statusCode` aunque existen en esquema.
- No se registra explícitamente `EXPORT_PDF`, aunque el enum lo contempla.
- No se auditan fallos de autenticación o intentos fallidos MFA desde el servicio real.

**Determinación:** la auditoría existe, pero su condición de “bitácora inmutable” no está demostrada técnicamente.

---

### 3.5. El versionado legal de consultas es parcial y no cumple literalmente lo declarado

**Estado:** alto  
**Impacto:** las correcciones conservan snapshot previo, pero el registro original sí se altera.

**Evidencia:**

- [backend/src/modules/consultations/consultations.service.ts](../backend/src/modules/consultations/consultations.service.ts) guarda snapshot en `consultationHistory`.
- Luego actualiza la fila original con `tx.consultation.update(...)`.

**Determinación:** esto aporta trazabilidad, pero **no equivale** a “crear nuevas versiones sin alterar el original”, que es lo indicado en [instrucciones.md](.github/instrucciones.md).

**Observación adicional:** no se exige motivo obligatorio de corrección para consulta, a diferencia del historial de pacientes.

---

### 3.6. Manejo inseguro de secretos y operación en instalación/backup

**Estado:** alto  
**Impacto:** credenciales y secretos quedan hardcodeados en repositorio y scripts operativos.

**Evidencia:**

- [install.sh](../install.sh) contiene contraseña DB y `JWT_SECRET` por defecto en texto plano.
- [backups/backup.sh](../backups/backup.sh) contiene `PGPASSWORD` hardcodeado.
- [backend/prisma/seed.ts](../backend/prisma/seed.ts) crea usuario admin con credencial conocida y documentada.

**Determinación:** esto es incompatible con un estándar robusto de protección de datos sensibles en producción.

---

## Medios

### 3.7. La búsqueda de pacientes existe en frontend, pero no como capacidad backend real

**Estado:** medio  
**Impacto:** el requisito “búsqueda por nombre o RUT” depende de filtrar localmente la lista completa cargada en cliente.

**Evidencia:**

- [frontend/src/pages/PatientsPage.tsx](../frontend/src/pages/PatientsPage.tsx) filtra en memoria por `fullName` y `rut`.
- [backend/src/modules/patients/patients.controller.ts](../backend/src/modules/patients/patients.controller.ts) no ofrece query params de búsqueda para la lista principal.

**Determinación:** funcionalmente existe desde la UI, pero no es una búsqueda backend escalable ni controlada.

---

### 3.8. Documentación e instrucciones desalineadas con el stack real

**Estado:** medio  
**Impacto:** aumenta riesgo de decisiones erróneas de mantenimiento e instalación.

**Evidencia:**

- [README.md](../README.md) e [instrucciones.md](.github/instrucciones.md) declaran React 18, Router v6 y Prisma v6.
- [frontend/package.json](../frontend/package.json) usa React 19.2 y React Router 7.13.
- [backend/package.json](../backend/package.json) usa Prisma 7.8.

**Determinación:** la documentación funcional quedó atrasada respecto del código real.

---

### 3.9. Token JWT almacenado en `localStorage`

**Estado:** medio  
**Impacto:** aumenta superficie de exposición ante XSS sobre una aplicación que maneja datos clínicos.

**Evidencia:**

- [frontend/src/context/AuthContext.tsx](../frontend/src/context/AuthContext.tsx) persiste token y usuario en `localStorage`.
- [frontend/src/api/client.ts](../frontend/src/api/client.ts) lo reinyecta en cada request.

**Determinación:** no es un bug funcional inmediato, pero sí una decisión débil para una aplicación con datos sensibles.

---

### 3.10. Cobertura automatizada prácticamente inexistente

**Estado:** medio  
**Impacto:** reduce confianza sobre regresiones en seguridad, acceso y trazabilidad.

**Evidencia:**

- Sólo existe [backend/src/app.controller.spec.ts](../backend/src/app.controller.spec.ts).
- No se encontraron tests frontend.

**Determinación:** el proyecto carece de red de seguridad automatizada para validar los requisitos más sensibles.

---

## 4. Matriz de Cumplimiento por Requisito

| Requisito | Estado | Evidencia | Observación |
| --- | --- | --- | --- |
| Login con email y contraseña | Implementado | auth service + argon2 | Correcto a nivel base |
| JWT con expiración configurable | Implementado | auth module | Correcto |
| MFA opcional TOTP | Parcial | backend auth + frontend settings | Lógica existe, pero afectada por `user.id/userId` |
| Guards autenticación | Implementado | JwtAuthGuard | Correcto |
| RBAC | Parcial | RolesGuard sólo en users | No protege toda la superficie clínica |
| Helmet | Implementado | main.ts | Correcto |
| Ficha completa paciente | Parcial | schema + patients | Falta evidencia de red de salud explícita |
| Consentimiento informado | Implementado/parcial | flags + documentos | Existe registro, sin enforcement por flujo |
| Acuerdo telemedicina | Implementado/parcial | flag + PDF + documentos | Existe, sin validación previa a sesión TELEMED |
| Soft delete paciente | Implementado | deletedAt | Correcto |
| Búsqueda por nombre o RUT | Parcial | filtro frontend | No backend search |
| Registro cronológico de sesiones | Implementado | consultations | Correcto |
| Campos clínicos mínimos | Implementado | create consultation dto | Correcto |
| Soporte presencial/telemedicina | Implementado | sessionType | Correcto |
| Versionado legal de consultas | Parcial | consultationHistory | Guarda snapshot, pero altera original |
| PDF ficha completa | Implementado/parcial | reports service | Genera PDF, pero sin control fino de acceso |
| Pie legal de custodia 15 años | Implementado | reports service | Correcto como texto |
| Auditoría automática | Implementado/parcial | audit interceptor/service | No cubre todos los eventos críticos |
| Auditoría inmutable | No demostrada | prisma + service | Falta enforcement DB |
| Backups diarios vía cron | Implementado | install.sh + backup.sh | Operativamente existe |
| Compresión gzip | Implementado | backup.sh | Correcto |
| Retención 30 días | Implementado | backup.sh | Correcto |
| Log en backup.log | Implementado | install.sh + README | Correcto por cron redirigido |

---

## 5. Evaluación Específica Frente a Riesgos de Ley 20.584 y Protección de Datos Sensibles

## 5.1. Ley 20.584

### Aspectos con evidencia favorable

- Existe ficha clínica estructurada.
- Se conserva historial de cambios de pacientes.
- Se registra tipo de sesión presencial/telemedicina.
- Existe exportación de ficha clínica completa.
- Hay mecanismo de soft delete en pacientes y usuarios.

### Aspectos con riesgo alto o parcial

- **Confidencialidad insuficiente** por falta de controles de acceso por recurso clínico.
- **Versionado legal incompleto** en consultas porque se modifica el registro original.
- **Telemedicina sin enforcement** de consentimiento o validaciones previas en backend.
- **Exposición pública por RUT** en ruta de próxima sesión.
- **Auditoría insuficiente** para demostrar trazabilidad completa de accesos y exportaciones.

## 5.2. Protección de datos sensibles bajo marco actualizado

### Aspectos con evidencia favorable

- Autenticación base y MFA existen en diseño.
- Helmet y validación de DTO están habilitados.
- Hay separación de módulos clínicos y de autenticación.
- Existe correlación de requests mediante middleware.

### Aspectos con riesgo alto o parcial

- Secretos en texto plano en scripts versionados.
- JWT en `localStorage` para una app de datos sensibles.
- Acceso excesivo a reportes, consultas y documentos.
- Datos públicos por endpoint abierto de agenda clínica.
- No hay evidencia de cifrado de archivos, rotación de secretos, ni controles formales de retención clínica distintos del texto en PDF y los backups.

---

## 6. Diferencias entre lo Declarado y lo Implementado

1. **Prisma**: la documentación habla de v6; el backend está en v7.8.
2. **React**: la documentación habla de React 18; el frontend usa React 19.
3. **React Router**: la documentación habla de v6; el frontend usa v7.
4. **Versionado legal de consultas**: declarado como nueva versión; implementado como snapshot + update.
5. **Auditoría inmutable**: declarada como append-only; implementada sólo a nivel aplicativo.
6. **Búsqueda por nombre/RUT**: declarada como capacidad del sistema; implementada sólo en cliente.

---

## 7. Fortalezas del Proyecto

- El modelo Prisma ya contempla varias entidades relevantes de salud: pacientes, consultas, historial, documentos, auditoría y archivos compartidos.
- Hay una base razonable de seguridad HTTP y autenticación.
- Se incorporó historial de pacientes y consultas, lo que acelera una remediación formal de versionado.
- El frontend ya resuelve bastante flujo funcional para operación diaria.
- El sistema de backups está automatizado y con retención definida.

---

## 8. Plan de Remediación Recomendado

### Paso 1. Corregir la identidad autenticada (`userId` vs `id`)

**Justificación:** desbloquea MFA, documentos, archivos compartidos y consistencia de auditoría.  
**Prioridad:** inmediata.

### Paso 2. Aplicar control de acceso por recurso clínico

**Justificación:** es el mayor riesgo de confidencialidad del sistema.  
**Prioridad:** inmediata.

Debe cubrir al menos:

- consultas por paciente;
- consulta individual;
- corrección de consulta;
- documentos por paciente;
- descarga de documento;
- generación de reportes PDF.

### Paso 3. Cerrar o rediseñar el endpoint público de próxima sesión

**Justificación:** hoy filtra datos personales/sensibles usando sólo RUT.  
**Prioridad:** inmediata.

Alternativas razonables:

- eliminarlo;
- exigir autenticación;
- reemplazar respuesta por estado mínimo no identificatorio;
- protegerlo con token temporal específico.

### Paso 4. Formalizar versionado legal de consultas

**Justificación:** hoy hay trazabilidad parcial, pero no la garantía fuerte declarada.  
**Prioridad:** alta.

Opciones:

- crear una tabla/versionamiento con registro vigente + versiones históricas;
- o marcar consulta como reemplazada y crear una nueva versión inmutable.

### Paso 5. Endurecer auditoría

**Justificación:** el sistema necesita demostrar trazabilidad de accesos clínicos y exportaciones.  
**Prioridad:** alta.

Debe incluir:

- `correlationId`;
- `statusCode`;
- evento específico para exportación PDF;
- fallos de login/MFA;
- estrategia de inmutabilidad en base de datos.

### Paso 6. Eliminar secretos hardcodeados y parametrizar operación

**Justificación:** actualmente hay exposición innecesaria de credenciales y rutas operativas.  
**Prioridad:** alta.

### Paso 7. Mover la búsqueda de pacientes a backend

**Justificación:** mejora escalabilidad, control de exposición y trazabilidad.  
**Prioridad:** media.

### Paso 8. Revisar almacenamiento de JWT y endurecer sesión

**Justificación:** el uso de `localStorage` no es ideal para datos clínicos.  
**Prioridad:** media.

### Paso 9. Actualizar documentación del stack real

**Justificación:** reduce errores operativos y de mantenimiento.  
**Prioridad:** media.

### Paso 10. Incorporar pruebas automatizadas sobre flujos sensibles

**Justificación:** sin tests, la remediación legal/técnica no queda protegida de regresiones.  
**Prioridad:** media.

---

## 9. Validaciones Ejecutadas Durante la Auditoría

- Revisión de esquema Prisma y migraciones presentes.
- Revisión de controladores/servicios backend para auth, pacientes, consultas, reportes, auditoría, documentos y archivos compartidos.
- Revisión de frontend para login, MFA, pacientes, consultas y sesión.
- Build frontend exitoso.
- Diagnósticos del editor sin errores reportados.

---

## 10. Dictamen Final

El proyecto **sí tiene una base sólida y ya resuelve gran parte del dominio clínico**, pero la implementación actual presenta brechas que impiden sostener de forma seria una afirmación de cumplimiento robusto.

La prioridad no es agregar nuevas pantallas ni nuevas funciones, sino **cerrar acceso por recurso, corregir inconsistencias de identidad autenticada, endurecer auditoría y eliminar exposición innecesaria de datos y secretos**.

Hasta que esos puntos no se resuelvan, la mejor calificación razonable es:

**Cumplimiento funcional: medio-alto**  
**Cumplimiento de seguridad y protección de datos: medio-bajo**  
**Aptitud para declarar cumplimiento normativo fuerte: no suficiente aún**
