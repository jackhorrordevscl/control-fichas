#!/bin/bash

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ No se encontró $ENV_FILE"
  exit 1
fi

if [[ -z "$DATABASE_URL" ]]; then
  DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | cut -d '=' -f 2-)
  DATABASE_URL="${DATABASE_URL%\"}"
  DATABASE_URL="${DATABASE_URL#\"}"
fi

if [[ -z "$DATABASE_URL" ]]; then
  echo "❌ DATABASE_URL no está configurado en $ENV_FILE"
  exit 1
fi

# ─── CONFIGURACIÓN ───────────────────────────────────────
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/files}"
BACKUP_SSD="${BACKUP_SSD:-/mnt/backup-ssd/umbral-backups}"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/umbral_backup_$DATE.sql.gz"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

# ─── CREAR DIRECTORIOS SI NO EXISTEN ─────────────────────
mkdir -p "$BACKUP_DIR"

# ─── GENERAR BACKUP ──────────────────────────────────────
echo "📦 Iniciando backup: $DATE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup generado: $BACKUP_FILE"
else
  echo "❌ Error al generar el backup"
  exit 1
fi

# ─── COPIAR AL SSD SECUNDARIO (Regla 3-2-1) ──────────────
if [ -d "$BACKUP_SSD" ]; then
  cp "$BACKUP_FILE" "$BACKUP_SSD/"
  echo "✅ Copia en SSD secundario: $BACKUP_SSD"
else
  echo "⚠️  SSD secundario no disponible, omitiendo copia"
fi

# ─── ELIMINAR BACKUPS ANTIGUOS ────────────────────────────
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_SSD" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null
echo "🧹 Backups antiguos eliminados (>${RETENTION_DAYS} días)"

echo "✅ Proceso completado"
