-- AlterTable
ALTER TABLE "PatientDocument" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "encrypted" BOOLEAN NOT NULL DEFAULT false;
