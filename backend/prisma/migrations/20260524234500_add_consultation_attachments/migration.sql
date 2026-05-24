ALTER TYPE "DocumentType" ADD VALUE 'CONSULTATION_ATTACHMENT';

ALTER TABLE "PatientDocument"
ADD COLUMN "consultationId" TEXT;

ALTER TABLE "PatientDocument"
ADD CONSTRAINT "PatientDocument_consultationId_fkey"
FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PatientDocument_consultationId_idx" ON "PatientDocument"("consultationId");