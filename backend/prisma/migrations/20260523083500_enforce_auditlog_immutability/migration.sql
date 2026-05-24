CREATE OR REPLACE FUNCTION prevent_auditlog_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_block_update ON "AuditLog";
CREATE TRIGGER auditlog_block_update
BEFORE UPDATE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_auditlog_mutation();

DROP TRIGGER IF EXISTS auditlog_block_delete ON "AuditLog";
CREATE TRIGGER auditlog_block_delete
BEFORE DELETE ON "AuditLog"
FOR EACH ROW
EXECUTE FUNCTION prevent_auditlog_mutation();
