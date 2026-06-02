-- AlterTable
ALTER TABLE "PatientDocument" ADD COLUMN     "encDataKey" TEXT,
ADD COLUMN     "encDataKeyIv" TEXT,
ADD COLUMN     "encDataKeyTag" TEXT,
ADD COLUMN     "iv" TEXT,
ADD COLUMN     "tag" TEXT;
