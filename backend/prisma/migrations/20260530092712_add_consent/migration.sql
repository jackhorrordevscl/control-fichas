-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('INFORMED_CONSENT', 'TELEMEDICINE', 'OTHER');

-- DropIndex
DROP INDEX "PatientDocument_consultationId_idx";

-- AlterTable
ALTER TABLE "ConsultationHistory" ALTER COLUMN "reason" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "type" "ConsentType" NOT NULL,
    "version" TEXT NOT NULL,
    "textHash" TEXT,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,
    "method" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Consent_patientId_idx" ON "Consent"("patientId");

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
