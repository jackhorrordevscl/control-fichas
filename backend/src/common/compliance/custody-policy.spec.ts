import { CUSTODY_POLICY, getCustodyFooterLines } from './custody-policy';

describe('custody policy', () => {
  it('expone una política de custodia centralizada', () => {
    expect(CUSTODY_POLICY.clinicalRecordRetentionYears).toBe(15);
    expect(CUSTODY_POLICY.operationalBackupRetentionDays).toBe(30);
    expect(CUSTODY_POLICY.hardDeleteAllowed).toBe(false);
    expect(CUSTODY_POLICY.clinicalDocumentPurgeAllowed).toBe(false);
  });

  it('genera las líneas legales del pie de reporte', () => {
    expect(getCustodyFooterLines()).toEqual([
      'Documento Confidencial',
      'Ley 20.584 — Custodia obligatoria 15 años',
      'Respaldo operativo: 30 días',
      'Para ejercer sus derechos ARCO (Ley 19.628), escriba a admin@morgadoyasociados.cl',
    ]);
  });
});