-- AlterTable
ALTER TABLE "CustomerOrder" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CustomerOrder_idempotencyKey_key" ON "CustomerOrder"("idempotencyKey");

-- CreateTable
CREATE TABLE "CustomerOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "mirrorModelId" TEXT,
    "modelCode" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "imageId" TEXT,
    "configJson" JSONB NOT NULL,
    "summaryJson" JSONB NOT NULL,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "CustomerOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerOrderLine_orderId_sortOrder_idx" ON "CustomerOrderLine"("orderId", "sortOrder");

-- AddForeignKey
ALTER TABLE "CustomerOrderLine" ADD CONSTRAINT "CustomerOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerOrderLine" ADD CONSTRAINT "CustomerOrderLine_mirrorModelId_fkey" FOREIGN KEY ("mirrorModelId") REFERENCES "MirrorModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
