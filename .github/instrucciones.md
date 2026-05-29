**Proyecto:** Control Fichas Clínicas
**Versión:** 1.1
**Fecha:** Mayo 2026
**Rol:** Senior Fullstack Developer / Tech Lead

---

## Resumen

Como developer fullstack, tu misión es investigar, analizar, comparar y optimizar el sistema de control de fichas clínicas ya desarrollado, verificando además su alineación técnica con los requisitos operativos y de resguardo asociados a la **Ley 20.584** y al tratamiento seguro de datos personales sensibles bajo el marco actualizado de la **Ley 19.628** y su modificación por **Ley 21.719**.

Este documento debe leerse junto con la auditoría técnica vigente y con el estado real del repositorio, no como una descripción histórica del proyecto.

---

## Consideraciones

- Indica los cambios paso a paso y justifica brevemente cada decisión técnica.
- Si propones o ejecutas cambios de código, identifica el archivo afectado y el diff correspondiente.
- No asumas compatibilidades, APIs ni comportamientos sin verificarlos en el código o documentación oficial cuando corresponda.
- Prioriza primero riesgo clínico, confidencialidad, trazabilidad, consistencia de identidad autenticada y seguridad operativa antes de agregar nuevas funcionalidades.
- Si una optimización ya fue implementada, documenta el estado real y avanza al siguiente pendiente de mayor prioridad.
- Backend desplegado en Render.
	Service ID: `srv-d750kki4d50c73e2hdkg`
	API base URL: `https://control-fichas-backend.onrender.com/api/v1`
- Frontend desplegado en Vercel.
- Base de datos PostgreSQL desplegada en Supabase.
	Connection string operativa: `postgresql://postgres.yzyxhxlqwxkcsuckyqny:bUIwsIF6jd2Nes5P@aws-1-sa-east-1.pooler.supabase.com:5432/postgres`
- Ya existe una base de datos con datos reales. Evitar en la medida de lo posible cualquier cambio destructivo, reseteo, recreación de esquema o procedimiento que pueda provocar pérdida de datos.

---

## Stack Tecnológico Real

**Frontend**
- React 19.2 + TypeScript 5.9
- Vite 7.3
- React Router 7.13
- TanStack Query 5
- Tailwind CSS
- React Hook Form + Zod
- Axios
- Lucide React

**Backend**
- NestJS 11 + TypeScript
- PostgreSQL
- Prisma 7.8 + `@prisma/adapter-pg`
- JWT + Passport
- Argon2
- Speakeasy + QRCode para MFA/TOTP
- PDFKit
- Helmet

---

## Requisitos Previos

- Node.js 20+
- PostgreSQL 15+
- npm

---

## Estructura Relevante del Proyecto

```text
control-fichas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── common/
│   │   ├── modules/
│   │   ├── prisma/
│   │   └── shared-files/
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   └── README.md
├── backups/
│   └── backup.sh
├── .github/
│   ├── AUDITORIA_PROYECTO_2026-05-22.md
│   └── informe_tecnico.MD
└── README.md
```

---

## Estado Funcional y Técnico Actual

### Autenticación y Seguridad
- Login con email y contraseña con hash Argon2.
- JWT con expiración configurable.
- MFA opcional con TOTP.
- Auditoría de login exitoso, login fallido y fallos de MFA.
- Middleware de correlación de requests.
- Sesión endurecida con cookie `httpOnly`, `SameSite=Lax`, restauración vía `/auth/me` y limpieza reactiva ante `401` sin recarga completa de la aplicación.

### Gestión de Pacientes
- CRUD con soft delete.
- Historial de cambios con motivo.
- Búsqueda backend por nombre o RUT mediante query `q`.
- Endpoint público de próxima sesión reducido a respuesta neutra no identificatoria.

### Registro Clínico
- Soporte para sesiones presenciales y telemedicina.
- Consentimiento informado obligatorio para cualquier consulta.
- Consentimiento de telemedicina obligatorio para sesiones `TELEMED`.
- Correcciones con versionado legal: la corrección crea una nueva versión vigente y conserva la anterior en historial.

### Reportes, Documentos y Acceso Clínico
- Control de acceso clínico aplicado por recurso para consultas, reportes y documentos.
- Exportación PDF de ficha clínica completa.
- Registro de exportación PDF en auditoría.

### Auditoría y Operación
- `AuditLog` enriquecido con `correlationId` y `statusCode`.
- `AuditLog` append-only a nivel de PostgreSQL.
- Instalación, seed y backup sin secretos hardcodeados.
- Backup operando desde `DATABASE_URL`.

---

## Requisitos Funcionales Objetivo

### Autenticación y Seguridad
- Login con email y contraseña.
- JWT con expiración configurable.
- MFA opcional compatible con apps autenticadoras.
- Guards de autenticación y controles de rol donde corresponda.
- Headers HTTP seguros con Helmet.

### Gestión de Pacientes
- Ficha clínica completa.
- Registro de consentimiento informado y de telemedicina.
- Soft delete.
- Búsqueda por nombre o RUT desde backend.

### Registro Clínico
- Registro cronológico de sesiones.
- Campos clínicos mínimos: motivo, intervención, acuerdos y próxima sesión.
- Soporte presencial y telemedicina.
- Correcciones con nueva versión vigente sin sobrescribir la versión histórica.

### Exportación PDF
- Ficha clínica completa en PDF.
- Inclusión de historial clínico.
- Pie legal de custodia.

### Auditoría
- Registro automático de acciones relevantes.
- Trazabilidad con usuario, acción, recurso, IP, user-agent, timestamp, `correlationId` y código HTTP.
- Restricción append-only real a nivel de base de datos.

### Backups
- Respaldo diario programable vía cron.
- Compresión gzip.
- Retención automática.
- Log operativo.

---

## Prioridades Vigentes de Optimización

### Cerradas o mayormente cerradas
- Consistencia `userId` vs `id`.
- Control de acceso por recurso clínico.
- Exposición pública por RUT.
- Inmutabilidad real de auditoría.
- Secretos hardcodeados en instalación, seed y backup.
- Búsqueda backend de pacientes.
- Versión legal principal de consultas.

### Pendientes activos
- Verificar operativamente en despliegues externos que frontend y backend usen la misma base URL esperada para la sesión por cookie.
- Confirmar en entornos desplegados adicionales la aplicación controlada de la migración más reciente, si no comparten la base local ya validada.
- Mantener esta documentación alineada con el estado real del repositorio.

