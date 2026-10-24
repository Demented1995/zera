-- CreateEnum
CREATE TYPE "ConfigStatus" AS ENUM ('DRAFT', 'COMPLETE', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('DRAFT', 'ISSUED', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SavedConfiguration" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "ConfigStatus" NOT NULL DEFAULT 'DRAFT',
    "configJson" JSONB NOT NULL,
    "calculationJson" JSONB,
    "shapeId" TEXT NOT NULL,
    "shapeLabel" TEXT NOT NULL,
    "widthMm" DECIMAL(12,2) NOT NULL,
    "heightMm" DECIMAL(12,2) NOT NULL,
    "glassTypeId" TEXT NOT NULL,
    "sinecost" DECIMAL(12,2),
    "wholesalePrice" DECIMAL(12,2),
    "retailPrice" DECIMAL(12,2),
    "internalNotes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerOffer" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "status" "OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "configurationId" TEXT,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientCompany" TEXT,
    "clientNotes" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceTier" TEXT NOT NULL DEFAULT 'retail',
    "validityDays" INTEGER NOT NULL DEFAULT 14,
    "validUntil" TIMESTAMP(3),
    "commercialNotes" TEXT,
    "draftConfigJson" JSONB,
    "draftCalculationJson" JSONB,
    "issuedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferRevision" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "snapshotJson" JSONB NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "servicesTotal" DECIMAL(12,2) NOT NULL,
    "offerTotal" DECIMAL(12,2) NOT NULL,
    "priceTier" TEXT NOT NULL,
    "configJson" JSONB NOT NULL,
    "calculationPublicJson" JSONB NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issuedById" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "OfferRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "legalName" TEXT,
    "taxId" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "bankDetails" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavedConfiguration_code_key" ON "SavedConfiguration"("code");

-- CreateIndex
CREATE INDEX "SavedConfiguration_status_idx" ON "SavedConfiguration"("status");

-- CreateIndex
CREATE INDEX "SavedConfiguration_updatedAt_idx" ON "SavedConfiguration"("updatedAt");

-- CreateIndex
CREATE INDEX "SavedConfiguration_name_idx" ON "SavedConfiguration"("name");

-- CreateIndex
CREATE INDEX "SavedConfiguration_code_idx" ON "SavedConfiguration"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOffer_number_key" ON "CustomerOffer"("number");

-- CreateIndex
CREATE INDEX "CustomerOffer_status_idx" ON "CustomerOffer"("status");

-- CreateIndex
CREATE INDEX "CustomerOffer_issuedAt_idx" ON "CustomerOffer"("issuedAt");

-- CreateIndex
CREATE INDEX "CustomerOffer_number_idx" ON "CustomerOffer"("number");

-- CreateIndex
CREATE INDEX "OfferRevision_offerId_issuedAt_idx" ON "OfferRevision"("offerId", "issuedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OfferRevision_offerId_revisionNumber_key" ON "OfferRevision"("offerId", "revisionNumber");

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedConfiguration" ADD CONSTRAINT "SavedConfiguration_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOffer" ADD CONSTRAINT "CustomerOffer_configurationId_fkey" FOREIGN KEY ("configurationId") REFERENCES "SavedConfiguration"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOffer" ADD CONSTRAINT "CustomerOffer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOffer" ADD CONSTRAINT "CustomerOffer_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRevision" ADD CONSTRAINT "OfferRevision_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "CustomerOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferRevision" ADD CONSTRAINT "OfferRevision_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
