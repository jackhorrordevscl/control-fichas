# Umbral SpA — Sistema de Gestión Clínica

Sistema de gestión de fichas clínicas para consulta psicológica, desarrollado para cumplir con la **Ley 20.584** (Derechos y Deberes de los Pacientes) y la **Ley 19.628** (Protección de la Vida Privada) de Chile.

---

## Stack Tecnológico

**Frontend**
- React 18 + TypeScript
- Tailwind CSS
- React Router v6
- TanStack Query (React Query)
- React Hook Form + Zod
- Axios
- Lucide React

**Backend**
- NestJS + TypeScript
- PostgreSQL
- Prisma ORM v6
- JWT + Passport
- Argon2 (hash de contraseñas)
- Speakeasy (MFA/TOTP)
- PDFKit (generación de reportes)
- Helmet.js (seguridad HTTP)

---

## Requisitos Previos

- Node.js v20+
- PostgreSQL 15+
- npm

---

## Instalación

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-usuario/control-fichas.git
cd control-fichas
```

### 2. Configurar la base de datos

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

### 3. Configurar el Backend

```bash
cd backend
npm install --legacy-peer-deps
```

Crea el archivo `.env` basándote en `.env.example`:

```bash
cp .env.example .env
nano .env
```

Contenido del `.env`:

```env
DATABASE_URL="postgresql://umbral_user:tu_password_seguro@localhost:5432/umbral_db"
JWT_SECRET="cambia-este-secreto-en-produccion"
JWT_EXPIRES_IN="8h"
MFA_APP_NAME="Umbral SpA"
FRONTEND_URL="http://localhost:5173"
```

Ejecutar migraciones y seed inicial:

```bash
npx prisma migrate dev --name init
npm run seed
```

### 4. Configurar el Frontend

```bash
cd ../frontend
npm install --legacy-peer-deps
```

Si vas a usar en red local, edita `src/api/client.ts` y cambia la `baseURL` con la IP de tu servidor:

```typescript
baseURL: 'http://TU_IP:3001/api/v1',
```

---

## Ejecución en Desarrollo

**Terminal 1 — Backend:**
```bash
cd backend
npm run start:dev
# Servidor en http://localhost:3001/api/v1
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# App en http://localhost:5173
```

### Credenciales por defecto

```
Email:     admin@umbral.cl
Password:  Umbral2024!
```

> ⚠️ Cambia estas credenciales inmediatamente después de la primera instalación.

---

## Estructura del Proyecto

```
control-fichas/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # Modelos de base de datos
│   │   └── migrations/           # Historial de migraciones
│   ├── src/
│   │   ├── common/
│   │   │   ├── guards/           # JWT Guard, Roles Guard
│   │   │   ├── decorators/       # CurrentUser, Roles
│   │   │   └── interceptors/     # Audit Interceptor
│   │   ├── modules/
│   │   │   ├── auth/             # Login, JWT, MFA
│   │   │   ├── patients/         # CRUD de pacientes
│   │   │   ├── consultations/    # Registro clínico
│   │   │   ├── reports/          # Generación de PDF
│   │   │   └── audit/            # Bitácora inmutable
│   │   └── prisma/               # Servicio Prisma
│   └── .env.example
├── frontend/
│   └── src/
│       ├── api/                  # Cliente HTTP (Axios)
│       ├── context/              # AuthContext
│       ├── components/           # Layout, Sidebar
│       └── pages/                # Login, Dashboard, Pacientes, Consultas, Seguridad
├── backups/
│   └── backup.sh                 # Script de backup automático
└── README.md
```

---

## Funcionalidades

### Autenticación y Seguridad
- Login con email y contraseña (hash Argon2)
- Tokens JWT con expiración configurable
- MFA opcional con TOTP (compatible con Google Authenticator y Authy)
- Guards de autenticación y control de roles (RBAC)
- Headers HTTP seguros con Helmet.js

### Gestión de Pacientes (Ley 20.584)
- Ficha completa con datos de identificación, contacto de emergencia y red de salud
- Registro de consentimiento informado y acuerdo de telemedicina
- Soft delete — los registros nunca se eliminan físicamente
- Búsqueda por nombre o RUT

### Registro Clínico
- Registro cronológico de sesiones con fecha y hora automática
- Campos: motivo de consulta, intervención, acuerdos y próxima sesión
- Soporte para sesiones presenciales y telemedicina
- Sistema de versionado legal — las correcciones crean nuevas versiones sin alterar el original

### Exportación PDF
- Generación de ficha clínica completa en PDF
- Incluye datos del paciente e historial clínico completo
- Pie de página con referencia a Ley 20.584 y custodia obligatoria de 15 años

### Auditoría (Bitácora Inmutable)
- Registro automático de todas las acciones del sistema
- Campos: usuario, acción, recurso, IP, user-agent y timestamp
- Tabla append-only — ningún registro puede modificarse ni eliminarse

### Backups Automáticos
- Script de backup diario programado vía cron (2:00 AM)
- Compresión gzip de los respaldos
- Retención automática de 30 días
- Log de ejecución en `backups/backup.log`

---

## API Endpoints

### Autenticación
```
POST /api/v1/auth/login
POST /api/v1/auth/mfa/verify
POST /api/v1/auth/mfa/generate  🔒
POST /api/v1/auth/mfa/enable    🔒
POST /api/v1/auth/mfa/disable   🔒
```

### Pacientes
```
GET    /api/v1/patients         🔒
POST   /api/v1/patients         🔒
GET    /api/v1/patients/:id     🔒
PATCH  /api/v1/patients/:id     🔒
DELETE /api/v1/patients/:id     🔒
```

### Consultas
```
POST  /api/v1/consultations                        🔒
GET   /api/v1/consultations/patient/:patientId     🔒
GET   /api/v1/consultations/:id                    🔒
PATCH /api/v1/consultations/:id/correct            🔒
```

### Reportes
```
GET /api/v1/reports/patient/:patientId    🔒
```

> 🔒 Requiere token JWT en el header `Authorization: Bearer <token>`

---

## Configuración de Backups

El script de backup está en `backups/backup.sh`. Para activarlo:

```bash
chmod +x backups/backup.sh

# Agregar al cron (ejecuta todos los días a las 2:00 AM)
crontab -e
```

Agregar la siguiente línea:

```
0 2 * * * /ruta/completa/control-fichas/backups/backup.sh >> /ruta/completa/control-fichas/backups/backup.log 2>&1
```

---

## Cumplimiento Legal

| Requisito | Implementación |
|---|---|
| Ficha clínica obligatoria | Módulo de pacientes con todos los campos exigidos |
| Secreto profesional | Datos cifrados en tránsito (HTTPS en producción) |
| Custodia 15 años | Soft delete + backups automáticos con retención configurable |
| Derecho del paciente a su ficha | Exportación PDF bajo demanda |
| Inalterabilidad de registros | Versionado en consultas + soft delete en pacientes |
| Bitácora de accesos | Audit Log inmutable con registro de todas las acciones |

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/db` |
| `JWT_SECRET` | Clave secreta para firmar tokens | Cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `8h` |
| `MFA_APP_NAME` | Nombre que aparece en la app autenticadora | `Umbral SpA` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `http://localhost:5173` |

---

## Licencia

Uso privado — Umbral SpA © 2026. Todos los derechos reservados.
