-- AlterTable
ALTER TABLE "MirrorModel" ADD COLUMN "stepWidthMm" DECIMAL(12,2),
ADD COLUMN "stepHeightMm" DECIMAL(12,2),
ADD COLUMN "configuratorRulesJson" JSONB,
ADD COLUMN "rulesVersion" INTEGER NOT NULL DEFAULT 1;
