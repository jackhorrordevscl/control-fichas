# Integración AWS KMS (clave maestra para envelope encryption)

Resumen
- El proyecto ahora soporta usar AWS KMS para proteger las claves de datos (envelope encryption). Cuando `KMS_KEY_ID` está configurado, la app usará `GenerateDataKey` para crear una data key por archivo y almacenará la `CiphertextBlob` en la columna `encDataKey` (Base64). Para desencriptar, la app usa `Decrypt` con esa `CiphertextBlob`.

Variables de entorno relevantes
- `KMS_KEY_ID`: ARN o alias de la CMK a usar (ej. `arn:aws:kms:us-east-1:123456789012:key/abcd-...` o `alias/my-key`).
- `AWS_REGION` o `S3_REGION`: región AWS para las llamadas al servicio KMS/S3.
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` (opcional): credenciales si no se usa IAM Role.
- `S3_AUDIT_BUCKET`: bucket para backups append-only de audit logs (opcional).
- `S3_OBJECT_LOCK_MODE`: `GOVERNANCE` o `COMPLIANCE` (si el bucket soporta Object Lock).
- `S3_OBJECT_LOCK_RETAIN_DAYS`: días a retener (si Object Lock se usa).

Pasos para habilitar (staging / production)
1. Crear una CMK en AWS KMS o usar una existente.
   - Anotar el ARN o crear un alias para usar en `KMS_KEY_ID`.

2. Conceder permisos a la identidad que ejecuta la aplicación (IAM role o user):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "kms:GenerateDataKey",
        "kms:Decrypt"
      ],
      "Resource": "arn:aws:kms:REGION:ACCOUNT:key/YOUR_KEY_ID"
    }
  ]
}
```

3. Exportar variables de entorno en el host/contendor:

```bash
export KMS_KEY_ID="arn:aws:kms:us-east-1:123456789012:key/xxxx"
export AWS_REGION=us-east-1
# Si no usa IAM role
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
```

4. (Opcional) Habilitar bucket S3 con Object Lock para backups de auditoría y configurar `S3_AUDIT_BUCKET` y `S3_OBJECT_LOCK_*`.

5. Reiniciar la aplicación. Los nuevos archivos subirán con `encDataKey` como el ciphertext KMS (base64). Los downloads usarán KMS Decrypt para recuperar la data key.

Consideraciones de seguridad
- KMS protege la clave maestra y evita que la app almacene claves maestras fijas.
- Revocar permisos de `kms:Decrypt` a producción puede dejar los archivos inservibles; pruebe rotación de clave y políticas en staging.

Rollback
- Para volver al modo local (FILE_ENCRYPTION_KEY), remover `KMS_KEY_ID` y configurar `FILE_ENCRYPTION_KEY` con una clave base64 válida. Los archivos creados con KMS seguirán necesitando la CMK para desencriptar.
