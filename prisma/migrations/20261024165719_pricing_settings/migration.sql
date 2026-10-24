-- CreateTable
CREATE TABLE "PricingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "wholesaleMarkupPercent" DECIMAL(8,2) NOT NULL DEFAULT 30,
    "retailMarkupPercent" DECIMAL(8,2) NOT NULL DEFAULT 70,
    "curvedEdgeAddMm" DECIMAL(8,2) NOT NULL DEFAULT 50,
    "sandblastMinCharge" DECIMAL(12,2) NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSettingsHistory" (
    "id" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedById" TEXT NOT NULL,

    CONSTRAINT "PricingSettingsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PricingSettingsHistory_changedAt_idx" ON "PricingSettingsHistory"("changedAt");

-- CreateIndex
CREATE INDEX "PricingSettingsHistory_fieldKey_idx" ON "PricingSettingsHistory"("fieldKey");

-- AddForeignKey
ALTER TABLE "PricingSettingsHistory" ADD CONSTRAINT "PricingSettingsHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
