-- Saved category order and visibility for the professional configurator.
CREATE TABLE "ConfiguratorLayout" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "sections" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguratorLayout_pkey" PRIMARY KEY ("id")
);
