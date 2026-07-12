-- Ley 20.584: custodia obligatoria de fichas clínicas por 15 años.
-- Este trigger bloquea a nivel de base de datos cualquier DELETE físico
-- (hard delete) sobre las tablas que contienen datos clínicos, sin importar
-- si el borrado se origina en la aplicación, una migración manual, o acceso
-- directo a la base de datos (psql, herramientas de administración, etc.).
-- El soft delete (columna deletedAt / isActive) sigue funcionando con
-- normalidad porque es un UPDATE, no un DELETE.

CREATE OR REPLACE FUNCTION prevent_clinical_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'No se permite eliminar registros clínicos: retención obligatoria de 15 años según Ley 20.584 (custodia de fichas clínicas)';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_hard_delete_patient
BEFORE DELETE ON "Patient"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_consultation
BEFORE DELETE ON "Consultation"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_consultation_history
BEFORE DELETE ON "ConsultationHistory"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_patient_document
BEFORE DELETE ON "PatientDocument"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_hard_delete();

CREATE TRIGGER trg_prevent_hard_delete_patient_history
BEFORE DELETE ON "PatientHistory"
FOR EACH ROW EXECUTE FUNCTION prevent_clinical_hard_delete();

-- Para desactivar este enforcement (solo bajo aprobación legal explícita,
-- por ejemplo tras cumplirse la retención de 15 años y decidirse un purgo
-- autorizado de registros específicos), un DBA debe ejecutar manualmente
-- y por tabla, fuera de la aplicación:
--   ALTER TABLE "Patient" DISABLE TRIGGER trg_prevent_hard_delete_patient;
--   ALTER TABLE "Consultation" DISABLE TRIGGER trg_prevent_hard_delete_consultation;
--   ALTER TABLE "ConsultationHistory" DISABLE TRIGGER trg_prevent_hard_delete_consultation_history;
--   ALTER TABLE "PatientDocument" DISABLE TRIGGER trg_prevent_hard_delete_patient_document;
--   ALTER TABLE "PatientHistory" DISABLE TRIGGER trg_prevent_hard_delete_patient_history;
-- No existe ni debe existir ningún mecanismo desde la aplicación (API,
-- servicio, script npm) para desactivar estos triggers.
