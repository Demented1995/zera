import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type MaterialsListFilters = {
  q?: string;
  categoryId?: string;
  status?: "all" | "active" | "inactive";
};

export async function listMaterialCategories(options?: {
  includeInactive?: boolean;
}) {
  return prisma.materialCategory.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listAllMaterialCategories() {
  return prisma.materialCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listMaterials(filters: MaterialsListFilters = {}) {
  const where: Prisma.MaterialWhereInput = {};

  if (filters.categoryId) {
    where.categoryId = filters.categoryId;
  }

  if (filters.status === "active") {
    where.isActive = true;
  } else if (filters.status === "inactive") {
    where.isActive = false;
  }

  const q = filters.q?.trim();
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { internalCode: { contains: q, mode: "insensitive" } },
    ];
  }

  return prisma.material.findMany({
    where,
    include: {
      category: true,
    },
    orderBy: [{ name: "asc" }],
  });
}

export async function getMaterialWithHistory(id: string) {
  return prisma.material.findUnique({
    where: { id },
    include: {
      category: true,
      priceHistory: {
        include: {
          changedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { changedAt: "desc" },
      },
    },
  });
}
