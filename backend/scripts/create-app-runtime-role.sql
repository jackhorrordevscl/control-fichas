-- Crea un rol de Postgres de mínimo privilegio para que la app se conecte
-- en runtime, separado del rol dueño de las tablas (ej. el superusuario
-- usado para correr `prisma migrate`).
--
-- Por qué: los triggers BEFORE DELETE de
-- prisma/migrations/20260712000000_enforce_clinical_retention/migration.sql
-- (Ley 20.584, custodia de fichas clínicas por 15 años) solo son una
-- garantía real si el rol con el que corre la app NO puede desactivarlos.
-- En Postgres, ALTER TABLE ... DISABLE TRIGGER requiere ser dueño de la
-- tabla (u owner de la base/superusuario) — por eso alcanza con que este
-- rol tenga privilegios de DML (SELECT/INSERT/UPDATE/DELETE) y nunca sea
-- el owner de las tablas.
--
-- Uso:
--   1. Reemplazar :app_password por una contraseña real generada aparte
--      (no commitear la contraseña real en ningún archivo del repo).
--   2. Correr como el rol que hoy es dueño de las tablas (el mismo que
--      corre `prisma migrate deploy`), típicamente el superusuario o el
--      rol administrador provisto por el proveedor de base de datos.
--   3. Apuntar el DATABASE_URL de la app (backend/.env en desarrollo, o el
--      secreto correspondiente en producción) al usuario `app_runtime` en
--      vez del rol administrador/owner.
--
-- Ejemplo:
--   psql -U postgres -h localhost -d <db> \
--     -v app_password="'una-password-fuerte-generada-aparte'" \
--     -f create-app-runtime-role.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_runtime') THEN
    CREATE ROLE app_runtime LOGIN PASSWORD :app_password;
  ELSE
    ALTER ROLE app_runtime PASSWORD :app_password;
  END IF;
END
$$;

GRANT CONNECT ON DATABASE current_database() TO app_runtime;
GRANT USAGE ON SCHEMA public TO app_runtime;

-- DML sobre las tablas existentes. Deliberadamente NO incluye
-- ALTER/TRIGGER/OWNERSHIP: ese es justamente el punto.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_runtime;

-- Mismos privilegios para tablas/secuencias que se creen a futuro vía
-- nuevas migraciones, sin tener que volver a correr este script a mano.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_runtime;

-- Verificación esperada después de correr esto, conectado como app_runtime:
--   ALTER TABLE "Patient" DISABLE TRIGGER trg_prevent_hard_delete_patient;
--   -> ERROR: debe ser dueño de la tabla Patient (permiso denegado)
--   DELETE FROM "Patient" WHERE id = '<id existente>';
--   -> ERROR: No se permite eliminar registros clínicos: retención
--      obligatoria de 15 años según Ley 20.584 (bloqueado por el trigger,
--      no por falta de permiso — la app puede seguir operando con
--      normalidad, solo no puede desactivar la protección).
