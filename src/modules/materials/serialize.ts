import type {
  Material,
  MaterialCategory,
  MaterialPriceHistory,
  User,
} from "@prisma/client";

import type {
  MaterialCategoryDTO,
  MaterialDTO,
  PriceHistoryDTO,
} from "@/modules/materials/types";

export function serializeCategory(
  category: MaterialCategory,
): MaterialCategoryDTO {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    isActive: category.isActive,
    sortOrder: category.sortOrder,
  };
}

export function serializeMaterial(
  material: Material & { category: MaterialCategory },
): MaterialDTO {
  return {
    id: material.id,
    name: material.name,
    internalCode: material.internalCode,
    categoryId: material.categoryId,
    categoryName: material.category.name,
    unitPrice: material.unitPrice?.toString() ?? null,
    unitOfMeasure: material.unitOfMeasure,
    currency: material.currency,
    description: material.description,
    isActive: material.isActive,
    createdAt: material.createdAt.toISOString(),
    updatedAt: material.updatedAt.toISOString(),
  };
}

export function serializePriceHistory(
  entry: MaterialPriceHistory & {
    changedBy: Pick<User, "id" | "name" | "email">;
  },
): PriceHistoryDTO {
  return {
    id: entry.id,
    previousPrice: entry.previousPrice?.toString() ?? null,
    newPrice: entry.newPrice?.toString() ?? null,
    changedAt: entry.changedAt.toISOString(),
    changedByName: entry.changedBy.name?.trim() || entry.changedBy.email,
    changedByEmail: entry.changedBy.email,
  };
}
