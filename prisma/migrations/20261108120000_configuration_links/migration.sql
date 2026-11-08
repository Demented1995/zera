CREATE TABLE "ConfigurationLink" (
    "token" TEXT NOT NULL,
    "mirrorModelId" TEXT NOT NULL,
    "requestJson" JSONB NOT NULL,
    "requestHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfigurationLink_pkey" PRIMARY KEY ("token")
);

CREATE INDEX "ConfigurationLink_mirrorModelId_idx" ON "ConfigurationLink"("mirrorModelId");

CREATE UNIQUE INDEX "ConfigurationLink_mirrorModelId_requestHash_key" ON "ConfigurationLink"("mirrorModelId", "requestHash");

ALTER TABLE "ConfigurationLink" ADD CONSTRAINT "ConfigurationLink_mirrorModelId_fkey" FOREIGN KEY ("mirrorModelId") REFERENCES "MirrorModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
