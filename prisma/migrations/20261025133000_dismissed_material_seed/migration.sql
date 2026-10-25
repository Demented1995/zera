-- Remember catalog options an admin deleted so they are not recreated.
CREATE TABLE "DismissedMaterialSeed" (
    "seedKey" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DismissedMaterialSeed_pkey" PRIMARY KEY ("seedKey")
);
