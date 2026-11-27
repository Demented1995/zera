-- A commercial model can also appear in one extra category.
-- Existing categoryId values stay as the primary category.

ALTER TABLE "MirrorModel" ADD COLUMN "secondaryCategoryId" TEXT;

CREATE INDEX "MirrorModel_secondaryCategoryId_idx" ON "MirrorModel"("secondaryCategoryId");

ALTER TABLE "MirrorModel" ADD CONSTRAINT "MirrorModel_secondaryCategoryId_fkey" FOREIGN KEY ("secondaryCategoryId") REFERENCES "MirrorModelCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
