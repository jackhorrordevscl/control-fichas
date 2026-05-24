# Umbral SpA — Sistema de Gestión Clínica

Sistema de gestión de fichas clínicas para consulta psicológica, orientado a control de acceso, trazabilidad clínica y resguardo operativo.

## Stack Tecnológico

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
- Speakeasy + QRCode para MFA
- PDFKit
- Helmet

## Requisitos Previos

- Node.js 20+
- npm
- PostgreSQL 15+

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/control-fichas.git
cd control-fichas
```

### 2. Configurar PostgreSQL

```bash
sudo -u postgres psql
```

```sql
CREATE USER umbral_user WITH PASSWORD 'tu_password_seguro';
CREATE DATABASE umbral_db OWNER umbral_user;
GRANT ALL PRIVILEGES ON DATABASE umbral_db TO umbral_user;
ALTER USER umbral_user CREATEDB;
\q
```

### 3. Configurar el backend

```bash
cd backend
npm install --legacy-peer-deps
```

Crear `.env` con valores seguros del entorno:

```env
DATABASE_URL="postgresql://umbral_user:tu_password_seguro@localhost:5432/umbral_db"
JWT_SECRET="cambia-este-secreto-en-produccion"
JWT_EXPIRES_IN="8h"
MFA_APP_NAME="Umbral SpA"
FRONTEND_URL="http://localhost:5173"
ADMIN_EMAIL="admin@umbral.cl"
ADMIN_PASSWORD="cambia-esta-clave"
ADMIN_NAME="Administrador Umbral"
```

Aplicar migraciones y seed inicial:

```bash
npx prisma migrate deploy
npm run seed
```

### 4. Configurar el frontend

```bash
cd ../frontend
npm install --legacy-peer-deps
```

Si necesitas cambiar la URL base de la API en desarrollo, ajústala en [frontend/src/api/client.ts](frontend/src/api/client.ts).

## Ejecución en Desarrollo

**Terminal 1 — Backend**

```bash
cd backend
npm run start:dev
```

Backend disponible en `http://localhost:3001/api/v1`.

**Terminal 2 — Frontend**

```bash
cd frontend
npm run dev
```

Frontend disponible en `http://localhost:5173`.

### Credenciales iniciales

Las credenciales del administrador dependen de `ADMIN_EMAIL` y `ADMIN_PASSWORD` del `.env` del backend.

El repositorio ya no define una contraseña fija de administrador.

## Funcionalidades Relevantes

### Autenticación y Seguridad
- Login con JWT
- MFA opcional con TOTP
- Auditoría enriquecida con `correlationId` y código HTTP
- Registro de fallos de login y MFA
- `AuditLog` append-only a nivel de PostgreSQL

### Gestión de Pacientes
- CRUD con soft delete
- Búsqueda por nombre o RUT desde backend mediante query `q`
- Historial de cambios con motivo obligatorio
- Restricción por propietario y rol sobre acceso clínico

### Consultas Clínicas
- Registro de sesiones presenciales y telemedicina
- Versionado legal: las correcciones crean una nueva versión vigente
- Consentimiento informado obligatorio para toda consulta
- Consentimiento de telemedicina obligatorio para sesiones `TELEMED`

### Reportes y Documentos
- Exportación PDF de ficha clínica
- Control de acceso por paciente para reportes y documentos

### Operación
- Script de instalación con secretos generados o inyectados por entorno
- Backup usando `DATABASE_URL` en vez de una contraseña hardcodeada en script

## Estructura

```text
control-fichas/
├── backend/
├── frontend/
├── backups/
├── install.sh
└── README.md
```

## Documentación por módulo

- [backend/README.md](backend/README.md)
- [frontend/README.md](frontend/README.md)
