-- Migration: Make AuditLog append-only at the DB level
BEGIN;

-- Create role for insert-only audit writes (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_audit_writer') THEN
    CREATE ROLE app_audit_writer NOINHERIT;
  END IF;
END $$;

-- Revoke UPDATE/DELETE from public and ensure only INSERT is allowed via role
REVOKE UPDATE, DELETE ON "AuditLog" FROM PUBLIC;

GRANT INSERT ON "AuditLog" TO app_audit_writer;

-- Prevent accidental UPDATE/DELETE by raising an error via trigger
CREATE OR REPLACE FUNCTION prevent_audit_modification() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: updates/deletes are not allowed';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_prevent_mod ON "AuditLog";
CREATE TRIGGER audit_prevent_mod
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

COMMIT;
