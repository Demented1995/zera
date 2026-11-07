ALTER TABLE "MirrorModelCategory" ADD COLUMN "featuredOnHome" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MirrorModelCategory" ADD COLUMN "homeSortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MirrorModelCategory" ADD COLUMN "homeCaption" TEXT;
