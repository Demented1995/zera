-- Stage 7.2 commercial copy and SEO. Romanian text stays on MirrorModel.
-- Existing slugs were saved explicitly, so name edits must not rewrite them.

ALTER TABLE "MirrorModel" ADD COLUMN "slugCustomized" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MirrorModel" ADD COLUMN "descriptionJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "highlightsJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "careJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "warrantyJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "deliveryJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "extraSpecsJson" JSONB;
ALTER TABLE "MirrorModel" ADD COLUMN "seoTitle" TEXT;
ALTER TABLE "MirrorModel" ADD COLUMN "seoDescription" TEXT;

UPDATE "MirrorModel" SET "slugCustomized" = true;

CREATE TABLE "MirrorModelSlugRedirect" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MirrorModelSlugRedirect_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MirrorModelSlugRedirect_slug_key" ON "MirrorModelSlugRedirect"("slug");
CREATE INDEX "MirrorModelSlugRedirect_modelId_idx" ON "MirrorModelSlugRedirect"("modelId");

ALTER TABLE "MirrorModelSlugRedirect" ADD CONSTRAINT "MirrorModelSlugRedirect_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MirrorModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
