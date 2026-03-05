#!/bin/bash

# ─── CONFIGURACIÓN ───────────────────────────────────────
DB_USER="umbral_user"
DB_NAME="umbral_db"
BACKUP_DIR="$HOME/Escritorio/control-fichas/backups/files"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/umbral_backup_$DATE.sql.gz"
RETENTION_DAYS=30

# ─── CREAR DIRECTORIO SI NO EXISTE ───────────────────────
mkdir -p "$BACKUP_DIR"

# ─── GENERAR BACKUP ──────────────────────────────────────
echo "📦 Iniciando backup: $DATE"
PGPASSWORD="umbral_password_2024" pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "✅ Backup exitoso: $BACKUP_FILE"
else
  echo "❌ Error al generar el backup"
  exit 1
fi

# ─── ELIMINAR BACKUPS ANTIGUOS (más de 30 días) ──────────
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
echo "🧹 Backups antiguos eliminados (>${RETENTION_DAYS} días)"

echo "✅ Proceso completado"
