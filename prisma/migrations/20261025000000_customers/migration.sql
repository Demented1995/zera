-- Customer registry. Existing offer client fields stay on CustomerOffer.

CREATE TYPE "CustomerKind" AS ENUM ('INDIVIDUAL', 'COMPANY');

CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "CustomerKind" NOT NULL,
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "displayName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "phoneKey" TEXT NOT NULL,
    "email" TEXT,
    "emailKey" TEXT,
    "companyName" TEXT,
    "idno" TEXT,
    "idnoKey" TEXT,
    "contactName" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomerAddress" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "label" TEXT,
    "line" TEXT NOT NULL,
    "city" TEXT,
    "postalCode" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE INDEX "Customer_phoneKey_idx" ON "Customer"("phoneKey");
CREATE INDEX "Customer_emailKey_idx" ON "Customer"("emailKey");
CREATE INDEX "Customer_idnoKey_idx" ON "Customer"("idnoKey");
CREATE INDEX "Customer_status_updatedAt_idx" ON "Customer"("status", "updatedAt");
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Customer"
ADD CONSTRAINT "Customer_updatedById_fkey"
FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CustomerAddress"
ADD CONSTRAINT "CustomerAddress_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CustomerOffer" ADD COLUMN "customerId" TEXT;

CREATE INDEX "CustomerOffer_customerId_idx" ON "CustomerOffer"("customerId");

ALTER TABLE "CustomerOffer"
ADD CONSTRAINT "CustomerOffer_customerId_fkey"
FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
