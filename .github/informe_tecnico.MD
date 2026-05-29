# Informe Técnico de Optimización

**Proyecto:** Control Fichas Clínicas / Umbral SpA  
**Fecha:** 24-05-2026  
**Base de referencia:** [AUDITORIA_PROYECTO_2026-05-22.md](./AUDITORIA_PROYECTO_2026-05-22.md) y [instrucciones.md](./instrucciones.md)  
**Objetivo:** consolidar el estado de remediación de los hallazgos de auditoría, priorizados por riesgo, con su justificación y porcentaje de avance.

---

## 1. Criterio de medición

### Escala de progreso por punto

- **0%**: no iniciado.
- **1% a 49%**: mitigación parcial o análisis avanzado sin cierre técnico.
- **50% a 89%**: remediación principal implementada, con deuda relevante todavía abierta.
- **90% a 99%**: objetivo casi cerrado, con remate menor pendiente.
- **100%**: remediación implementada y validada en el alcance auditado.

### Cálculo del progreso global

El avance global se calcula ponderando por criticidad:

- **Crítico = peso 4**
- **Alto = peso 3**
- **Intermedio = peso 2**
- **Bajo = peso 1**

Con ese criterio, el **progreso global de la optimización es 100%** en el alcance verificable del workspace y su entorno local configurado.

---

## 2. Resumen Ejecutivo de Avance

| Prioridad | Hallazgos | Estado general |
| --- | ---: | --- |
| Crítico | 3 | Cerrados en el alcance auditado |
| Alto | 3 | Cerrados en el alcance auditado |
| Intermedio | 4 | Cerrados en el alcance auditado |
| Bajo | 0 | Sin hallazgos explícitos en la auditoría base |

### Lectura ejecutiva

- La superficie de mayor riesgo regulatorio ya fue atacada: identidad autenticada, control de acceso clínico y exposición pública por RUT.
- La trazabilidad y la inmutabilidad de auditoría quedaron reforzadas a nivel de base de datos y de eventos registrados.
- La última migración pendiente ya fue aplicada en la base configurada del workspace y el esquema quedó al día.
- La automatización cubre ahora también flujos end-to-end de sesión por cookie, auditoría y corrección clínica con motivo obligatorio.
- La deuda documental principal ya fue cerrada al alinear README e [instrucciones.md](./instrucciones.md) con el estado real del repositorio.

---

## 3. Plan Consolidado por Prioridad

## Críticos

### 3.1. Controles de acceso incompletos sobre recursos clínicos sensibles

- **Prioridad:** crítica
- **Progreso:** **100%**
- **Justificación del hallazgo:** era el mayor riesgo de confidencialidad porque permitía que usuarios autenticados accedieran a consultas, reportes o documentos fuera de su ámbito si conocían IDs válidos.
- **Estado actual:** corregido.
- **Optimización aplicada:** se centralizó la verificación de acceso clínico reutilizando control por paciente en consultas, reportes y documentos, incluyendo la subida, listado y descarga de documentos.
- **Justificación del progreso:** el objetivo auditado era aplicar mínimo privilegio por recurso clínico, y esa restricción ya quedó implementada y validada en los slices críticos.

### 3.2. Desalineación `userId` vs `id` en identidad autenticada

- **Prioridad:** crítica
- **Progreso:** **100%**
- **Justificación del hallazgo:** rompía flujos transversales de seguridad y trazabilidad, especialmente MFA, subida de documentos, archivos compartidos y operaciones de usuarios.
- **Estado actual:** corregido.
- **Optimización aplicada:** se unificó el consumo de identidad autenticada sobre `userId` en controladores y rutas dependientes del JWT.
- **Justificación del progreso:** la inconsistencia estructural fue eliminada y los flujos afectados dejaron de depender de una propiedad incorrecta en runtime.

### 3.3. Exposición pública de datos por consulta de próxima sesión vía RUT

- **Prioridad:** crítica
- **Progreso:** **100%**
- **Justificación del hallazgo:** el endpoint exponía datos personales y de agenda clínica sensibles usando sólo el RUT como llave de consulta.
- **Estado actual:** corregido.
- **Optimización aplicada:** la ruta pública fue neutralizada para responder con un mensaje no identificatorio, sin nombre de paciente, terapeuta ni detalle de próxima sesión.
- **Justificación del progreso:** la auditoría proponía como alternativa válida reemplazar la respuesta por un estado mínimo no identificatorio; eso ya quedó implementado.

## Altos

### 3.4. Auditoría no realmente inmutable a nivel de base de datos

- **Prioridad:** alta
- **Progreso:** **100%**
- **Justificación del hallazgo:** una bitácora sólo append-only por convención de servicio no alcanza para demostrar trazabilidad robusta ni resistencia frente a manipulación fuera de la aplicación.
- **Estado actual:** corregido.
- **Optimización aplicada:** se agregó enforcement append-only en PostgreSQL, además de enriquecer los registros con `correlationId`, `statusCode`, eventos de exportación PDF y eventos de autenticación fallida.
- **Justificación del progreso:** el problema principal era la falta de enforcement duro y cobertura de eventos críticos; ambos puntos fueron resueltos dentro del alcance auditado.

### 3.5. Versionado legal de consultas parcial

- **Prioridad:** alta
- **Progreso:** **100%**
- **Justificación del hallazgo:** el sistema declaraba crear nuevas versiones sin alterar el original, pero en la práctica actualizaba la fila existente y sólo guardaba snapshot histórico.
- **Estado actual:** corregido.
- **Optimización aplicada:** la corrección de consultas ahora crea una nueva versión vigente, conserva la anterior como histórica y bloquea nuevas correcciones sobre versiones antiguas.
- **Justificación del progreso:** además del versionado legal ya implementado, la corrección ahora exige motivo obligatorio y ese motivo queda persistido en `ConsultationHistory`, cerrando la trazabilidad narrativa pendiente.

### 3.6. Manejo inseguro de secretos y operación en instalación/backup

- **Prioridad:** alta
- **Progreso:** **100%**
- **Justificación del hallazgo:** tener contraseñas, `JWT_SECRET`, credenciales de admin y variables operativas hardcodeadas en repositorio o scripts es incompatible con un estándar serio de protección de datos sensibles.
- **Estado actual:** corregido.
- **Optimización aplicada:** el flujo de instalación y seed pasó a usar valores del entorno o secretos generados, y el backup dejó de depender de una contraseña fija embebida en script.
- **Justificación del progreso:** se eliminó la exposición directa que originaba el hallazgo y el modelo operativo quedó parametrizado.

## Intermedios

### 3.7. Búsqueda de pacientes sólo implementada en frontend

- **Prioridad:** intermedia
- **Progreso:** **100%**
- **Justificación del hallazgo:** filtrar en memoria desde el cliente no era equivalente a una búsqueda real controlada por backend, y además obligaba a cargar la lista completa.
- **Estado actual:** corregido.
- **Optimización aplicada:** se agregó búsqueda backend por nombre o RUT mediante query `q`, y el frontend pasó a consumir esa capacidad en vez de filtrar localmente toda la colección.
- **Justificación del progreso:** el requisito funcional ya existe como capacidad real del backend y quedó validado por llamadas HTTP.

### 3.8. Documentación e instrucciones desalineadas con el stack real

- **Prioridad:** intermedia
- **Progreso:** **100%**
- **Justificación del hallazgo:** una documentación desfasada induce errores de instalación, mantenimiento y evaluación técnica del sistema.
- **Estado actual:** corregido.
- **Optimización aplicada:** se actualizaron los README principales del repositorio, backend y frontend para reflejar el stack real, el flujo de instalación vigente y los cambios operativos ya implementados.
- **Justificación del progreso:** el archivo [instrucciones.md](./instrucciones.md) también fue alineado con el stack real, el estado técnico vigente y las prioridades actuales de optimización, por lo que la deuda documental del hallazgo auditado quedó cerrada.

### 3.9. Token JWT almacenado en `localStorage`

- **Prioridad:** intermedia
- **Progreso:** **100%**
- **Justificación del hallazgo:** para una aplicación que maneja datos clínicos, `localStorage` amplía innecesariamente la superficie de exposición ante XSS y deja una persistencia demasiado laxa.
- **Estado actual:** corregido.
- **Optimización aplicada:** la autenticación migró a cookie `httpOnly` en backend, el frontend dejó de enviar `Bearer` desde almacenamiento JavaScript, y la restauración de sesión ahora ocurre vía `/auth/me` con cookie de sesión.
- **Justificación del progreso:** el hallazgo auditado se refería al almacenamiento del JWT en `localStorage`; ese comportamiento ya fue eliminado y el token dejó de quedar expuesto al cliente JavaScript de la misma manera.

### 3.10. Cobertura automatizada prácticamente inexistente

- **Prioridad:** intermedia
- **Progreso:** **100%**
- **Justificación del hallazgo:** sin pruebas automatizadas, los endurecimientos de seguridad y trazabilidad quedan expuestos a regresiones silenciosas.
- **Estado actual:** corregido en el alcance auditado del repositorio.
- **Optimización aplicada:** además de las validaciones manuales y compilaciones focalizadas, ya existen pruebas unitarias del servicio de autenticación para auditoría de login y MFA; del `AuthController` para login/logout con cookie `httpOnly`; del `AuditInterceptor` para eventos de exportación PDF y upload de documentos; del servicio de consultas para consentimiento, versionado y motivo obligatorio; del servicio de pacientes para búsqueda backend y restricciones de acceso por rol; y de reportes/documentos para validación de acceso clínico por paciente y documento. También se agregaron pruebas end-to-end reales del flujo de sesión por cookie (`/auth/login` -> `/auth/me`), de auditoría sobre un endpoint protegido de reportes y de corrección clínica con motivo obligatorio.
- **Justificación del progreso:** dentro del alcance auditado y del entorno verificable en este workspace, ya existen pruebas automatizadas sobre los flujos más sensibles de autenticación, sesión, auditoría, consultas, pacientes, reportes y documentos, incluyendo validaciones end-to-end de comportamiento y contratos HTTP.

## Bajos

### 3.11. Hallazgos de prioridad baja

- **Prioridad:** baja
- **Progreso:** **100%**
- **Justificación:** la auditoría base no definió hallazgos explícitos clasificados como bajos.
- **Estado actual:** sin pendientes específicos en esta categoría dentro del documento auditado.

---

## 4. Porcentaje de Progreso por Punto

| ID | Hallazgo | Prioridad | Progreso |
| --- | --- | --- | ---: |
| 3.1 | Acceso por recurso clínico | Crítico | 100% |
| 3.2 | Consistencia `userId` vs `id` | Crítico | 100% |
| 3.3 | Endpoint público por RUT | Crítico | 100% |
| 3.4 | Auditoría inmutable y enriquecida | Alto | 100% |
| 3.5 | Versionado legal de consultas | Alto | 100% |
| 3.6 | Secretos y operación segura | Alto | 100% |
| 3.7 | Búsqueda backend de pacientes | Intermedio | 100% |
| 3.8 | Documentación alineada | Intermedio | 100% |
| 3.9 | Endurecimiento de sesión JWT | Intermedio | 100% |
| 3.10 | Cobertura automatizada | Intermedio | 100% |

---

## 5. Progreso Global de la Optimización

### Resultado actual

- **Progreso global simple no ponderado:** **100%**
- **Progreso global ponderado por riesgo:** **100%**

### Interpretación recomendada

El porcentaje más representativo para gestión es el **100% ponderado** dentro del alcance verificable del workspace, porque el proyecto ya resolvió los hallazgos con impacto directo en confidencialidad, trazabilidad y operación segura, y además dejó aplicada la última migración local pendiente junto con cobertura end-to-end sobre los flujos transversales más sensibles.

---

## 6. Pendientes Reales para Cierre

### Pendientes prioritarios aún abiertos

No quedan pendientes técnicos abiertos dentro del alcance verificable del workspace y su entorno local configurado.

Como seguimiento operativo externo al workspace, sigue siendo recomendable confirmar la ejecución controlada de la misma migración en cualquier entorno desplegado adicional que no comparta esta base local.

---

## 7. Dictamen Técnico Actualizado

El proyecto ya no se encuentra en el mismo estado descrito por la auditoría original. Los hallazgos de mayor severidad fueron abordados y, en el estado actual del repositorio y de la base configurada en este workspace, la remediación auditada puede considerarse cerrada.

### Estado consolidado al 24-05-2026

- **Cumplimiento funcional:** alto
- **Cumplimiento técnico de seguridad:** alto
- **Cumplimiento de trazabilidad:** alto
- **Aptitud para seguir optimización:** favorable
- **Brecha remanente más importante:** verificación operativa en despliegues externos al workspace, si se desea cerrar también ese frente fuera del entorno local validado