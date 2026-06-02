#!/bin/bash

set -euo pipefail

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
MANIFEST_FILE="$BACKUP_DIR/umbral_backup_$DATE.manifest.json"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

log() {
  echo "$1"
}

# ─── CREAR DIRECTORIOS SI NO EXISTEN ─────────────────────
mkdir -p "$BACKUP_DIR"

# ─── GENERAR BACKUP ──────────────────────────────────────
log "📦 Iniciando backup: $DATE"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"

log "✅ Backup generado: $BACKUP_FILE"

ENCRYPTED=false

# Si se proporcionó clave de cifrado, cifrar el backup y eliminar el archivo sin cifrar
if [[ -n "${BACKUP_ENCRYPTION_KEY:-}" ]]; then
  ENC_FILE="${BACKUP_FILE}.enc"
  log "🔒 Cifrando backup..."
  openssl enc -aes-256-cbc -pbkdf2 -salt -in "$BACKUP_FILE" -out "$ENC_FILE" -pass pass:"$BACKUP_ENCRYPTION_KEY"
  rm -f "$BACKUP_FILE"
  BACKUP_FILE="$ENC_FILE"
  ENCRYPTED=true
  log "✅ Backup cifrado: $BACKUP_FILE"
fi

sha256sum "$BACKUP_FILE" > "$BACKUP_FILE.sha256"
cat > "$MANIFEST_FILE" <<EOF
{
  "createdAt": "$DATE",
  "backupFile": "$(basename "$BACKUP_FILE")",
  "checksumFile": "$(basename "$BACKUP_FILE.sha256")",
  "encrypted": $ENCRYPTED,
  "retentionDays": $RETENTION_DAYS
}
EOF

log "🧾 Manifest generado: $MANIFEST_FILE"

# ─── COPIAR AL SSD SECUNDARIO (Regla 3-2-1) ──────────────
if [ -d "$BACKUP_SSD" ]; then
  cp "$BACKUP_FILE" "$BACKUP_SSD/"
  cp "$BACKUP_FILE.sha256" "$BACKUP_SSD/"
  cp "$MANIFEST_FILE" "$BACKUP_SSD/"
  log "✅ Copia en SSD secundario: $BACKUP_SSD"
else
  log "⚠️  SSD secundario no disponible, omitiendo copia"
fi

# ─── ELIMINAR BACKUPS ANTIGUOS ────────────────────────────
find "$BACKUP_DIR" -type f \( -name "umbral_backup_*.sql.gz" -o -name "umbral_backup_*.sql.gz.enc" -o -name "umbral_backup_*.sql.gz.sha256" -o -name "umbral_backup_*.sql.gz.enc.sha256" -o -name "umbral_backup_*.manifest.json" \) -mtime +"$RETENTION_DAYS" -delete
find "$BACKUP_SSD" -type f \( -name "umbral_backup_*.sql.gz" -o -name "umbral_backup_*.sql.gz.enc" -o -name "umbral_backup_*.sql.gz.sha256" -o -name "umbral_backup_*.sql.gz.enc.sha256" -o -name "umbral_backup_*.manifest.json" \) -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
log "🧹 Backups antiguos eliminados (> ${RETENTION_DAYS} días)"

log "✅ Proceso completado"
