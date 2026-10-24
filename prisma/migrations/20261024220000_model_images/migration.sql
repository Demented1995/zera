-- CreateEnum
CREATE TYPE "MirrorImageKind" AS ENUM ('SECONDARY', 'DETAIL', 'AMBIENT');

-- CreateTable
CREATE TABLE "MirrorModelImage" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "kind" "MirrorImageKind" NOT NULL DEFAULT 'SECONDARY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "altText" TEXT NOT NULL DEFAULT '',
    "internalNote" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "widthPx" INTEGER NOT NULL,
    "heightPx" INTEGER NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorModelImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MirrorModelImage_modelId_sortOrder_idx" ON "MirrorModelImage"("modelId", "sortOrder");

-- CreateIndex
CREATE INDEX "MirrorModelImage_modelId_isPrimary_idx" ON "MirrorModelImage"("modelId", "isPrimary");

-- CreateIndex
CREATE INDEX "MirrorModelImage_storageKey_idx" ON "MirrorModelImage"("storageKey");

-- One primary photo per commercial model.
CREATE UNIQUE INDEX "MirrorModelImage_one_primary_per_model" ON "MirrorModelImage"("modelId") WHERE "isPrimary" = true;

-- AddForeignKey
ALTER TABLE "MirrorModelImage" ADD CONSTRAINT "MirrorModelImage_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MirrorModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorModelImage" ADD CONSTRAINT "MirrorModelImage_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
