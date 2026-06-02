-- Create enums for data subject requests
CREATE TYPE "DataSubjectRequestType" AS ENUM ('ACCESS', 'RECTIFICATION', 'REVOCATION', 'OPPOSITION', 'EXPORT');
CREATE TYPE "DataSubjectRequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'REJECTED', 'CLOSED');

-- Create table for data subject requests
CREATE TABLE "DataSubjectRequest" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "type" "DataSubjectRequestType" NOT NULL,
  "status" "DataSubjectRequestStatus" NOT NULL DEFAULT 'PENDING',
  "details" TEXT,
  "evidence" JSONB,
  "requestedBy" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "resolutionNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DataSubjectRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DataSubjectRequest"
  ADD CONSTRAINT "DataSubjectRequest_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "DataSubjectRequest_patientId_idx" ON "DataSubjectRequest"("patientId");
