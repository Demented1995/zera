-- CreateTable
CREATE TABLE "MaterialCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaterialCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "internalCode" TEXT,
    "seedKey" TEXT,
    "categoryId" TEXT NOT NULL,
    "unitPrice" DECIMAL(12,2),
    "unitOfMeasure" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MDL',
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialPriceHistory" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "previousPrice" DECIMAL(12,2),
    "newPrice" DECIMAL(12,2),
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "MaterialPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_name_key" ON "MaterialCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialCategory_slug_key" ON "MaterialCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Material_internalCode_key" ON "Material"("internalCode");

-- CreateIndex
CREATE UNIQUE INDEX "Material_seedKey_key" ON "Material"("seedKey");

-- CreateIndex
CREATE INDEX "Material_categoryId_idx" ON "Material"("categoryId");

-- CreateIndex
CREATE INDEX "Material_isActive_idx" ON "Material"("isActive");

-- CreateIndex
CREATE INDEX "Material_name_idx" ON "Material"("name");

-- CreateIndex
CREATE INDEX "MaterialPriceHistory_materialId_changedAt_idx" ON "MaterialPriceHistory"("materialId", "changedAt");

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "MaterialCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceHistory" ADD CONSTRAINT "MaterialPriceHistory_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialPriceHistory" ADD CONSTRAINT "MaterialPriceHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
