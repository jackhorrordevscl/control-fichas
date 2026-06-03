export const CUSTODY_POLICY = {
  clinicalRecordRetentionYears: 15,
  operationalBackupRetentionDays: 30,
  hardDeleteAllowed: false,
  clinicalDocumentPurgeAllowed: false,
} as const;

export function getCustodyFooterLines() {
  return [
    'Documento Confidencial',
    `Ley 20.584 — Custodia obligatoria ${CUSTODY_POLICY.clinicalRecordRetentionYears} años`,
    `Respaldo operativo: ${CUSTODY_POLICY.operationalBackupRetentionDays} días`,
  ];
}