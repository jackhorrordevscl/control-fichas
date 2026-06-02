# Runbook: Rotación manual de `FILE_ENCRYPTION_KEY`

Propósito: pasos seguros para rotar la clave maestra usada por `FILE_ENCRYPTION_KEY` cuando no hay KMS.

1) Preparación
 - Generar `NEW_KEY` segura (ej: `openssl rand -base64 32`).
 - Asegurar `NEW_KEY` en el vault/secret store temporal (o inyectarla en entorno de despliegue en modo staging).

2) Habilitar nueva clave para nuevos uploads
 - Actualizar deployment/config para exponer `FILE_ENCRYPTION_KEY=NEW_KEY` en los procesos que deban usar la nueva clave.
 - Reiniciar rollingly las instancias para que usen la nueva clave (si aplica).

3) Re-encriptar archivos existentes (opcional, masivo)
 - Crear un job seguro que:
   a) Liste los documentos que tienen `encrypted = true` y que fueron cifrados con la clave antigua (detectar por metadatos si aplica).
   b) Para cada documento:
      - Descargar el objeto (S3 o almacenamiento local).
      - Descifrar localmente usando la `OLD_KEY` y los metadatos (`encDataKey`, `encDataKeyIv`, `encDataKeyTag`, `iv`, `tag`).
      - Re-encriptar con la `NEW_KEY` usando el mismo esquema envelope (genera nuevo `encDataKey`, ivs y tags).
      - Subir el nuevo objeto y actualizar los metadatos (`encDataKey`, `encDataKeyIv`, etc.) en la fila `patient_document`.
      - Registrar cada paso en un log WORM y verificar `contentHash` tras la operación.

4) Validación
 - Verificar acceso de descarga a una muestra representativa de archivos.
 - Revisar logs y métricas, confirmar que no hay fallos o archivos corruptos.

5) Retirada de clave anterior
 - Mantener `OLD_KEY` en almacen seguro por un periodo de retención (p.ej. 30 días) antes de destruirla, por si hay problemas.
 - Tras el periodo, destruir `OLD_KEY` de forma segura.

Notas de seguridad
 - Ejecutar re-encrypt en entornos aislados y con acceso controlado.
 - No almacenar claves en texto claro en repositorios.
 - Mantener auditoría WORM sobre operaciones de rotación.
