-- Unpriced catalog items stay uncategorized until an admin assigns a category.
ALTER TABLE "Material" ALTER COLUMN "categoryId" DROP NOT NULL;
