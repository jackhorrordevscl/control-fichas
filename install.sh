#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

generate_secret() {
  node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
}

DB_USER="${DB_USER:-umbral_user}"
DB_PASSWORD="${DB_PASSWORD:-$(generate_secret)}"
DB_NAME="${DB_NAME:-umbral_db}"
JWT_SECRET_VALUE="${JWT_SECRET:-$(generate_secret)}"
ADMIN_EMAIL_VALUE="${ADMIN_EMAIL:-admin@umbral.cl}"
ADMIN_PASSWORD_VALUE="${ADMIN_PASSWORD:-$(generate_secret)}"
ADMIN_NAME_VALUE="${ADMIN_NAME:-Administrador Umbral}"
FRONTEND_URL_VALUE="${FRONTEND_URL:-http://localhost:5173}"

echo "🚀 Instalando Sistema de Gestión Clínica Umbral SpA"
echo "=================================================="

# ─── VERIFICAR NODE ───────────────────────────────────
echo "📦 Verificando Node.js..."
NODE_VERSION=$(node --version 2>/dev/null)
if [ -z "$NODE_VERSION" ]; then
  echo "❌ Node.js no encontrado. Instalando via nvm..."
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  source ~/.bashrc
  nvm install 20
  nvm use 20
else
  echo "✅ Node.js $NODE_VERSION encontrado"
fi

# ─── CONFIGURAR NPM ───────────────────────────────────
echo "⚙️  Configurando npm..."
npm config set legacy-peer-deps true

# ─── INSTALAR POSTGRESQL ──────────────────────────────
echo "🐘 Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "Instalando PostgreSQL..."
  sudo apt update
  sudo apt install -y postgresql postgresql-contrib
else
  echo "✅ PostgreSQL ya instalado"
fi

sudo systemctl start postgresql
sudo systemctl enable postgresql

# ─── CREAR BASE DE DATOS ──────────────────────────────
echo "🗄️  Configurando base de datos..."
sudo -u postgres psql <<EOF
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${DB_USER}') THEN
    CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  ELSE
    ALTER USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
ALTER USER ${DB_USER} CREATEDB;
EOF
echo "✅ Base de datos configurada"

# ─── BACKEND ──────────────────────────────────────────
echo "⚙️  Instalando dependencias del backend..."
cd "$BACKEND_DIR"

# Crear .env si no existe
if [ ! -f .env ]; then
  echo "📝 Creando archivo .env del backend..."
  cat > .env <<EOL
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}"
JWT_SECRET="${JWT_SECRET_VALUE}"
JWT_EXPIRES_IN="8h"
MFA_APP_NAME="Umbral SpA"
FRONTEND_URL="${FRONTEND_URL_VALUE}"
ADMIN_EMAIL="${ADMIN_EMAIL_VALUE}"
ADMIN_PASSWORD="${ADMIN_PASSWORD_VALUE}"
ADMIN_NAME="${ADMIN_NAME_VALUE}"
EOL
  echo "✅ .env creado"
else
  echo "✅ .env ya existe"
fi

npm install
npx prisma migrate deploy
npm run seed

echo "✅ Backend configurado"

# ─── FRONTEND ─────────────────────────────────────────
echo "🎨 Instalando dependencias del frontend..."
cd "$ROOT_DIR/frontend"
npm install
echo "✅ Frontend configurado"

# ─── BACKUP ───────────────────────────────────────────
echo "💾 Configurando backups automáticos..."
mkdir -p "$ROOT_DIR/backups/files"
chmod +x "$ROOT_DIR/backups/backup.sh"

# Agregar cron si no existe
CRON_JOB="0 2 * * * $(realpath "$ROOT_DIR")/backups/backup.sh >> $(realpath "$ROOT_DIR")/backups/backup.log 2>&1"
if ! crontab -l 2>/dev/null | grep -q "backup.sh"; then
  (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
  echo "✅ Backup automático configurado (2:00 AM diario)"
else
  echo "✅ Backup automático ya configurado"
fi

# ─── RESUMEN ──────────────────────────────────────────
echo ""
echo "=================================================="
echo "✅ Instalación completada"
echo ""
echo "Para iniciar el sistema:"
echo ""
echo "  Terminal 1 (Backend):"
echo "  cd backend && npm run start:dev"
echo ""
echo "  Terminal 2 (Frontend):"
echo "  cd frontend && npm run dev"
echo ""
echo "  Acceder en: http://localhost:5173"
echo "  Email admin:      $ADMIN_EMAIL_VALUE"
echo "  Password admin:   $ADMIN_PASSWORD_VALUE"
echo "  Usuario DB:       $DB_USER"
echo "  Base de datos:    $DB_NAME"
echo "=================================================="