/*
  Warnings:

  - A unique constraint covering the columns `[previousVersionId]` on the table `Consultation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Consultation" ADD COLUMN     "isCurrent" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "previousVersionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Consultation_previousVersionId_key" ON "Consultation"("previousVersionId");

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_previousVersionId_fkey" FOREIGN KEY ("previousVersionId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
