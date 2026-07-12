export const CUSTODY_POLICY = {
  clinicalRecordRetentionYears: 15,
  operationalBackupRetentionDays: 30,
  // Este flag es solo declarativo/documental. El enforcement real e
  // irrevocable desde la aplicación ocurre en Postgres, vía triggers
  // BEFORE DELETE definidos en la migración
  // `prisma/migrations/20260712000000_enforce_clinical_retention/migration.sql`,
  // que bloquean cualquier hard delete sobre Patient, Consultation,
  // ConsultationHistory, PatientDocument y PatientHistory.
  hardDeleteAllowed: false,
  clinicalDocumentPurgeAllowed: false,
} as const;

export function getCustodyFooterLines() {
  return [
    'Documento Confidencial',
    `Ley 20.584 — Custodia obligatoria ${CUSTODY_POLICY.clinicalRecordRetentionYears} años`,
    `Respaldo operativo: ${CUSTODY_POLICY.operationalBackupRetentionDays} días`,
    'Para ejercer sus derechos ARCO (Ley 19.628), escriba a admin@morgadoyasociados.cl',
  ];
}