import type { MirrorModelStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function listMirrorCategories(options?: {
  activeOnly?: boolean;
}) {
  return prisma.mirrorModelCategory.findMany({
    where: options?.activeOnly ? { isActive: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listMirrorModels(filters: {
  q?: string;
  status?: MirrorModelStatus | "ALL";
  categoryId?: string;
  sort?: "name" | "updatedAt";
  order?: "asc" | "desc";
}) {
  const where: Prisma.MirrorModelWhereInput = {};
  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status;
  }
  const and: Prisma.MirrorModelWhereInput[] = [];
  if (filters.categoryId && filters.categoryId !== "ALL") {
    and.push({
      OR: [
        { categoryId: filters.categoryId },
        { secondaryCategoryId: filters.categoryId },
      ],
    });
  }
  const q = filters.q?.trim();
  if (q) {
    and.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
        { slug: { contains: q, mode: "insensitive" } },
        { shapeLabel: { contains: q, mode: "insensitive" } },
        { shortDescription: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  if (and.length > 0) {
    where.AND = and;
  }

  const sort = filters.sort ?? "updatedAt";
  const order = filters.order ?? "desc";

  return prisma.mirrorModel.findMany({
    where,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      secondaryCategory: { select: { id: true, name: true, slug: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      _count: { select: { offers: true } },
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { id: true },
      },
    },
    orderBy: { [sort]: order },
  });
}

export async function getMirrorModel(id: string) {
  return prisma.mirrorModel.findUnique({
    where: { id },
    include: {
      category: true,
      secondaryCategory: true,
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      sourceConfiguration: { select: { id: true, code: true, name: true } },
      _count: { select: { offers: true } },
    },
  });
}

export async function getMirrorModelBySlug(slug: string) {
  return prisma.mirrorModel.findUnique({ where: { slug } });
}
