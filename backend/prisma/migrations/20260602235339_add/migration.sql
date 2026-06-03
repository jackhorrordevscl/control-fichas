-- DropForeignKey
ALTER TABLE "DataSubjectRequest" DROP CONSTRAINT "DataSubjectRequest_patientId_fkey";

-- AlterTable
ALTER TABLE "Consent" ADD COLUMN     "documentId" TEXT;

-- CreateIndex
CREATE INDEX "Consent_documentId_idx" ON "Consent"("documentId");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "PatientDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataSubjectRequest" ADD CONSTRAINT "DataSubjectRequest_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
