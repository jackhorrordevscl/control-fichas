# Aplicar migración: inmutabilidad de `AuditLog`

Resumen
- Esta migración crea un role `app_audit_writer`, revoca `UPDATE`/`DELETE` sobre la tabla `AuditLog` y añade un trigger que evita modificaciones.

Pasos de despliegue (seguro)
1. Revise el contenido de `prisma/migrations/20260530140000_audit_immutability/migration.sql`.
2. En un entorno de staging/backup, ejecutar:

```bash
cd backend
# Crear la migración en Prisma (ya está incluida aquí como create-only)
npx prisma migrate deploy
```

3. Asignar el role `app_audit_writer` al usuario de la aplicación (ejemplo si su DB user es `app_user`):

```sql
-- Conéctese a la DB como superuser
GRANT app_audit_writer TO app_user;
```

4. Verificar que la aplicación puede `INSERT` en `AuditLog` y que `UPDATE`/`DELETE` fallan.

Rollback (si necesario)
- Para revertir la migración, eliminar el trigger y restaurar permisos:

```sql
DROP TRIGGER IF EXISTS audit_prevent_mod ON "AuditLog";
DROP FUNCTION IF EXISTS prevent_audit_modification();
REVOKE INSERT ON "AuditLog" FROM app_audit_writer;
DROP ROLE IF EXISTS app_audit_writer;
```

Notas
- Asegúrese de probar este cambio en staging antes de aplicarlo en producción.
- Si su aplicación usa un único DB user, asigne ese usuario al role `app_audit_writer` para que pueda seguir insertando logs.
