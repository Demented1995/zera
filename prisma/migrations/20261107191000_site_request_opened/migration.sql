ALTER TABLE "CustomerOrder" ADD COLUMN "openedAt" TIMESTAMP(3);
CREATE INDEX "CustomerOrder_placedById_openedAt_idx" ON "CustomerOrder"("placedById", "openedAt");
