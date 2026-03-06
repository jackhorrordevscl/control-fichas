#!/bin/bash

# ─── CONFIGURACIÓN ───────────────────────────────────────
DB_USER="umbral_user"
DB_NAME="umbral_db"
BACKUP_DIR="$HOME/Escritorio/control-fichas/backups/files"
BACKUP_SSD="/mnt/backup-ssd/umbral-backups"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_FILE="$BACKUP_DIR/umbral_backup_$DATE.sql.gz"
RETENTION_DAYS=30

# ─── CREAR DIRECTORIOS SI NO EXISTEN ─────────────────────
mkdir -p "$BACKUP_DIR"

# ─── GENERAR BACKUP ──────────────────────────────────────
echo "📦 Iniciando backup: $DATE"
PGPASSWORD="umbral_password_2024" pg_dump -U "$DB_USER" -h localhost "$DB_NAME" | gzip > "$BACKUP_FILE"

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
