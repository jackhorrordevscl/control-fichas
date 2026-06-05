# Claves de cifrado y S3 — Guía técnica actualizada

**Última actualización:** 2026-06-05 (sincronización con estado real del repositorio)

---

## Estado real de implementación (verificado 2026-06-05)

### AWS KMS — IMPLEMENTADO ✅

La integración con AWS KMS está **completamente implementada** en el código. No es planificada: ya existe código funcional.

**Clave KMS activa:**
- ARN: `arn:aws:kms:sa-east-1:505718059430:key/2c56ab46-dc28-4992-a9a9-cec3c20f4683`
- Región: `sa-east-1` (São Paulo)
- Account: `505718059430`

**Políticas IAM creadas (archivos en raíz del repositorio):**
- `kms-app-policy.json` — permisos mínimos para la app: `kms:GenerateDataKey` + `kms:Decrypt`
- `kms-admin-policy.json` — permisos de administración de clave: rotación, etiquetado, alias
- `kms-use-policy.json` — duplicado de app-policy (puede consolidarse)
- `trust-policy.json` — permite al account root asumir el rol

**Cómo funciona (Envelope Encryption en `backend/src/modules/documents/encryption.ts`):**

```
Si KMS_KEY_ID está configurado:
  1. kms.generateDataKey({ KeyId, KeySpec: 'AES_256' }) → { Plaintext, CiphertextBlob }
  2. Cifra el archivo con dataKey (AES-256-GCM) → ciphertext, iv, tag
  3. Almacena CiphertextBlob como encDataKey (encDataKeyIv = null → indica modo KMS)

Si solo FILE_ENCRYPTION_KEY (modo local):
  1. Genera dataKey aleatoria (32 bytes)
  2. Cifra archivo con dataKey (AES-256-GCM) → ciphertext, iv, tag
  3. Cifra dataKey con masterKey (AES-256-GCM) → encDataKey, encDataKeyIv, encDataKeyTag

Al descargar: detecta modo por presencia/ausencia de encDataKeyIv
  - Si null → KMS path: kms.decrypt(CiphertextBlob) → dataKey → descifra archivo
  - Si valor → local path: descifra dataKey con masterKey → descifra archivo
```

**Tipos de documento que REQUIEREN cifrado:**
- `PATIENT_REPORT` ✅
- `CONSULTATION_ATTACHMENT` ✅

**Tipos que NO requieren cifrado:** `INFORMED_CONSENT`, `TELEMED_AGREEMENT`, `OTHER`

**Script de verificación:** `backend/scripts/verify-kms.ts`
```bash
KMS_KEY_ID=<arn> npx ts-node backend/scripts/verify-kms.ts
# o con clave local:
FILE_ENCRYPTION_KEY=<base64> npx ts-node backend/scripts/verify-kms.ts
```

---

### Cifrado de Backups — IMPLEMENTADO ✅

El script `backups/backup.sh` cifra con `openssl enc -aes-256-cbc -pbkdf2 -salt` cuando `BACKUP_ENCRYPTION_KEY` está presente. Genera SHA-256 checksum + manifest JSON. Copia a SSD secundario (regla 3-2-1). Retención de 30 días.

**Nota técnica:** usa AES-256-CBC (no GCM). La integridad se verifica via SHA-256 del archivo cifrado (no mediante auth tag). Esto es suficiente para detección de corrupción accidental pero no para detección de manipulación activa. Para mayor seguridad reemplazar con `openssl enc -aes-256-gcm` o usar KMS para backups también.

**Verificación:**
```bash
npm --prefix backend run verify:backup
```

---

## Variables de entorno

| Variable | Uso | Requerida |
|----------|-----|-----------|
| `KMS_KEY_ID` | ARN o alias de clave KMS (prevalece sobre FILE_ENCRYPTION_KEY) | En prod (recomendado) |
| `FILE_ENCRYPTION_KEY` | Clave AES-256 en base64 (fallback si no hay KMS) | En dev/si no hay KMS |
| `BACKUP_ENCRYPTION_KEY` | Clave para cifrado de backups (separada de documentos) | Recomendada siempre |
| `AWS_REGION` | Región AWS para KMS y S3 (ej: `sa-east-1`) | Si usa KMS |
| `AWS_ACCESS_KEY_ID` | Solo si no usa IAM role | No en prod con roles IAM |
| `AWS_SECRET_ACCESS_KEY` | Solo si no usa IAM role | No en prod con roles IAM |
| `S3_BUCKET` | Bucket S3 para almacenamiento de documentos (opcional) | No (opcional) |
| `S3_REGION` | Región S3 (fallback de AWS_REGION) | No (opcional) |

**Nota:** En desarrollo local, `install.sh` genera `FILE_ENCRYPTION_KEY` y `BACKUP_ENCRYPTION_KEY` automáticamente si no están definidas. En modo estricto (`STRICT_SECRET_MODE=true`) exige que vengan del entorno.

---

## S3 — Estado actual

El código de `documents.controller.ts` detecta si `storagePath` comienza con `s3://` y descarga/descifra desde S3. Sin embargo, el upload actual guarda localmente en disco (no sube a S3 automáticamente). S3 está preparado en el código de descarga pero no como backend de almacenamiento primario.

**Para habilitar S3 como backend primario:** configurar `S3_BUCKET` y modificar `DocumentsService.uploadDocument` para subir a S3 en lugar de disco local.

---

## Runbook de rotación de FILE_ENCRYPTION_KEY

Ver detalle en [`runbooks/rotate-file-keys.md`](runbooks/rotate-file-keys.md). Resumen:

1. Generar nueva clave: `openssl rand -base64 32`
2. Configurar en secret manager como activa
3. Re-encriptar documentos existentes (proceso batch con old_key → new_key)
4. Verificar integridad post-rotación
5. Destruir old_key tras periodo de retención

---

## Auditoría de claves

- `DOCUMENT_UPLOAD` y `DOCUMENT_DOWNLOAD` están en el enum `AuditAction` y son emitidos por el interceptor
- Mantener log de rotaciones de clave separado del `AuditLog` de la aplicación
- No commitear claves en el repositorio. Usar `STRICT_SECRET_MODE=true` en entornos controlados.
