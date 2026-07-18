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
# En local (sin pooler) es la misma conexión que DATABASE_URL. En producción
# con un pooler delante (ej. Supabase/PgBouncer), DIRECT_URL debe ser la
# conexión directa, no la pooled — Prisma Migrate la necesita para funcionar.
DIRECT_URL="postgresql://umbral_user:tu_password_seguro@localhost:5432/umbral_db"
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
- Compresión gzip + cifrado AES-256 de los respaldos (nunca se escribe un volcado sin cifrar a disco)
- Credenciales de base de datos vía `.pgpass`, nunca hardcodeadas en el script
- Rotación operativa de 30 días **separada** de un archivo de custodia legal mensual que nunca se borra (Ley 20.584: 15 años)
- Segunda copia local en un dispositivo físico distinto (NAS) — copia offsite real todavía pendiente de definir proveedor
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

El script de backup está en `backups/backup.sh`. Antes de activarlo, configurá dos archivos protegidos **fuera del repositorio** (nunca en git):

```bash
# 1. Credenciales de base de datos
echo "localhost:5432:umbral_db:umbral_user:TU_PASSWORD" >> ~/.pgpass
chmod 600 ~/.pgpass

# 2. Frase de cifrado — guardá una copia en un gestor de contraseñas.
#    Sin ella, los backups cifrados son irrecuperables.
openssl rand -base64 48 > ~/.umbral_backup_passphrase
chmod 600 ~/.umbral_backup_passphrase
```

Variables opcionales (todas tienen un default razonable si no se configuran — ver comentarios al inicio de `backup.sh`):

| Variable | Para qué |
|---|---|
| `BACKUP_DIR` | Backups operativos, rotan cada `RETENTION_DAYS` |
| `ARCHIVE_DIR` | Custodia legal — nunca se borra automáticamente |
| `NAS_DIR` | Segunda copia local en un dispositivo físico distinto (regla 3-2-1) |
| `OFFSITE_UPLOAD_CMD` | Hook para subir a un destino offsite real (S3/B2/rclone) — pendiente de definir proveedor |

Activarlo:

```bash
chmod +x backups/backup.sh

# Agregar al cron (ejecuta todos los días a las 2:00 AM)
crontab -e
```

Agregar la siguiente línea:

```
0 2 * * * /ruta/completa/control-fichas/backups/backup.sh >> /ruta/completa/control-fichas/backups/backup.log 2>&1
```

Restaurar un backup:

```bash
openssl enc -d -aes-256-cbc -pbkdf2 -pass file:"$HOME/.umbral_backup_passphrase" \
  -in umbral_backup_2026-07-15_02-00-00.sql.gz.enc | gunzip | \
  psql -U umbral_user -h localhost -d umbral_db
```

---

## Cumplimiento Legal

| Requisito | Implementación |
|---|---|
| Ficha clínica obligatoria | Módulo de pacientes con todos los campos exigidos |
| Secreto profesional | Datos cifrados en tránsito (HTTPS en producción) |
| Custodia 15 años | Soft delete + archivo de custodia legal mensual cifrado que nunca se borra (separado de la rotación operativa de 30 días) |
| Derecho del paciente a su ficha | Exportación PDF bajo demanda |
| Inalterabilidad de registros | Versionado en consultas + soft delete en pacientes |
| Bitácora de accesos | Audit Log inmutable con registro de todas las acciones |

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexión PostgreSQL (pooled en producción) | `postgresql://user:pass@localhost:5432/db` |
| `DIRECT_URL` | Conexión directa (sin pooler) para `prisma migrate` | Igual a `DATABASE_URL` en local |
| `JWT_SECRET` | Clave secreta para firmar tokens | Cadena aleatoria larga |
| `JWT_EXPIRES_IN` | Tiempo de expiración del token | `8h` |
| `MFA_APP_NAME` | Nombre que aparece en la app autenticadora | `Umbral SpA` |
| `FRONTEND_URL` | URL del frontend (para CORS) | `http://localhost:5173` |
| `RUN_MIGRATIONS` | Si es `true`, corre `prisma migrate deploy` al arrancar (ver `main.ts`) | `false` |

> ⚠️ Si el comando de arranque del hosting ya corre `prisma migrate deploy` antes de iniciar el server (recomendado), **no** setees `RUN_MIGRATIONS=true` también — no rompe nada (la migración es idempotente), pero la corre dos veces innecesariamente.

---

## Licencia

Uso privado — Umbral SpA © 2026. Todos los derechos reservados.
