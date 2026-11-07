ALTER TABLE "MirrorModelCategory" ADD COLUMN "nameRu" TEXT;
ALTER TABLE "MirrorModelCategory" ADD COLUMN "descriptionRu" TEXT;
ALTER TABLE "MirrorModelCategory" ADD COLUMN "homeCaptionRu" TEXT;
ALTER TABLE "MirrorModel" ADD COLUMN "translationsJson" JSONB;
