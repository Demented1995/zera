-- CreateEnum
CREATE TYPE "MirrorModelStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateTable
CREATE TABLE "MirrorModelCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirrorModelCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MirrorModel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortDescription" TEXT,
    "fullDescription" TEXT,
    "categoryId" TEXT NOT NULL,
    "status" "MirrorModelStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "configJson" JSONB NOT NULL,
    "calculationJson" JSONB,
    "calcStatus" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "shapeId" TEXT NOT NULL,
    "shapeLabel" TEXT NOT NULL,
    "glassTypeId" TEXT NOT NULL,
    "defaultWidthMm" DECIMAL(12,2) NOT NULL,
    "defaultHeightMm" DECIMAL(12,2) NOT NULL,
    "minWidthMm" DECIMAL(12,2),
    "maxWidthMm" DECIMAL(12,2),
    "minHeightMm" DECIMAL(12,2),
    "maxHeightMm" DECIMAL(12,2),
    "sinecost" DECIMAL(12,2),
    "wholesalePrice" DECIMAL(12,2),
    "retailPrice" DECIMAL(12,2),
    "sourceConfigurationId" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MirrorModel_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "CustomerOffer" ADD COLUMN "mirrorModelId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "MirrorModelCategory_name_key" ON "MirrorModelCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorModelCategory_slug_key" ON "MirrorModelCategory"("slug");

-- CreateIndex
CREATE INDEX "MirrorModelCategory_isActive_sortOrder_idx" ON "MirrorModelCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorModel_code_key" ON "MirrorModel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "MirrorModel_slug_key" ON "MirrorModel"("slug");

-- CreateIndex
CREATE INDEX "MirrorModel_status_idx" ON "MirrorModel"("status");

-- CreateIndex
CREATE INDEX "MirrorModel_categoryId_idx" ON "MirrorModel"("categoryId");

-- CreateIndex
CREATE INDEX "MirrorModel_updatedAt_idx" ON "MirrorModel"("updatedAt");

-- CreateIndex
CREATE INDEX "MirrorModel_name_idx" ON "MirrorModel"("name");

-- CreateIndex
CREATE INDEX "MirrorModel_slug_idx" ON "MirrorModel"("slug");

-- CreateIndex
CREATE INDEX "MirrorModel_isPublished_idx" ON "MirrorModel"("isPublished");

-- AddForeignKey
ALTER TABLE "MirrorModelCategory" ADD CONSTRAINT "MirrorModelCategory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorModel" ADD CONSTRAINT "MirrorModel_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MirrorModelCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorModel" ADD CONSTRAINT "MirrorModel_sourceConfigurationId_fkey" FOREIGN KEY ("sourceConfigurationId") REFERENCES "SavedConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorModel" ADD CONSTRAINT "MirrorModel_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MirrorModel" ADD CONSTRAINT "MirrorModel_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOffer" ADD CONSTRAINT "CustomerOffer_mirrorModelId_fkey" FOREIGN KEY ("mirrorModelId") REFERENCES "MirrorModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
