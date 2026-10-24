import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { mediaPath } from "@/modules/catalog/images/service";

export const CATALOG_PAGE_SIZE = 12;

export function publicSaleBlock(model: {
  status: string;
  calcStatus: string;
  retailPrice: unknown;
}): string | null {
  if (model.status !== "ACTIVE") {
    return "Modelul trebuie să fie Activ ca să apară în magazin.";
  }
  if (model.calcStatus !== "COMPLETE" || model.retailPrice == null) {
    return "Prețul cu amănuntul trebuie să fie complet.";
  }
  return null;
}

/** Active, published models with a complete saved retail price. */
export const sellableModelWhere = {
  status: "ACTIVE",
  isPublished: true,
  calcStatus: "COMPLETE",
  retailPrice: { not: null },
} satisfies Prisma.MirrorModelWhereInput;

export type CatalogFilters = {
  q: string;
  category: string;
  shape: string;
  minWidth: number | null;
  maxWidth: number | null;
  minHeight: number | null;
  maxHeight: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  page: number;
};

export type PublicModelCard = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  categoryName: string;
  categorySlug: string;
  shapeId: string;
  shapeLabel: string;
  widthMm: number;
  heightMm: number;
  retailPrice: number;
  image: { src: string; alt: string } | null;
};

export type PublicCompany = {
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
};

function optionalNumber(value: string | undefined): number | null {
  if (!value?.trim()) {
    return null;
  }
  const parsed = Number(value.replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) {
    return null;
  }
  return parsed;
}

export function parseCatalogFilters(raw: {
  q?: string;
  categorie?: string;
  forma?: string;
  latimeMin?: string;
  latimeMax?: string;
  inaltimeMin?: string;
  inaltimeMax?: string;
  pretMin?: string;
  pretMax?: string;
  page?: string;
}): CatalogFilters {
  const page = Number(raw.page);
  return {
    q: (raw.q ?? "").trim().slice(0, 80),
    category: (raw.categorie ?? "").trim().slice(0, 80),
    shape: (raw.forma ?? "").trim().slice(0, 40),
    minWidth: optionalNumber(raw.latimeMin),
    maxWidth: optionalNumber(raw.latimeMax),
    minHeight: optionalNumber(raw.inaltimeMin),
    maxHeight: optionalNumber(raw.inaltimeMax),
    minPrice: optionalNumber(raw.pretMin),
    maxPrice: optionalNumber(raw.pretMax),
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
  };
}

function catalogWhere(filters: CatalogFilters): Prisma.MirrorModelWhereInput {
  const q = filters.q;
  return {
    AND: [
      sellableModelWhere,
      q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { shortDescription: { contains: q, mode: "insensitive" } },
              { shapeLabel: { contains: q, mode: "insensitive" } },
              { category: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {},
      filters.category ? { category: { slug: filters.category, isActive: true } } : {},
      filters.shape ? { shapeId: filters.shape } : {},
      filters.minWidth != null ? { defaultWidthMm: { gte: filters.minWidth } } : {},
      filters.maxWidth != null ? { defaultWidthMm: { lte: filters.maxWidth } } : {},
      filters.minHeight != null ? { defaultHeightMm: { gte: filters.minHeight } } : {},
      filters.maxHeight != null ? { defaultHeightMm: { lte: filters.maxHeight } } : {},
      filters.minPrice != null ? { retailPrice: { gte: filters.minPrice } } : {},
      filters.maxPrice != null ? { retailPrice: { lte: filters.maxPrice } } : {},
    ],
  };
}

const cardSelect = {
  id: true,
  slug: true,
  name: true,
  shortDescription: true,
  shapeId: true,
  shapeLabel: true,
  defaultWidthMm: true,
  defaultHeightMm: true,
  retailPrice: true,
  category: { select: { name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: { id: true, altText: true },
  },
} satisfies Prisma.MirrorModelSelect;

function toCard(row: {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  shapeId: string;
  shapeLabel: string;
  defaultWidthMm: Prisma.Decimal;
  defaultHeightMm: Prisma.Decimal;
  retailPrice: Prisma.Decimal | null;
  category: { name: string; slug: string };
  images: Array<{ id: string; altText: string }>;
}): PublicModelCard {
  const image = row.images[0];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortDescription: row.shortDescription,
    categoryName: row.category.name,
    categorySlug: row.category.slug,
    shapeId: row.shapeId,
    shapeLabel: row.shapeLabel,
    widthMm: Number(row.defaultWidthMm),
    heightMm: Number(row.defaultHeightMm),
    retailPrice: Number(row.retailPrice),
    image: image
      ? {
          src: mediaPath(row.id, image.id, "thumb"),
          alt: image.altText.trim() || row.name,
        }
      : null,
  };
}

export async function listPublicModels(filters: CatalogFilters) {
  const where = catalogWhere(filters);
  const page = filters.page;
  const [total, rows] = await Promise.all([
    prisma.mirrorModel.count({ where }),
    prisma.mirrorModel.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip: (page - 1) * CATALOG_PAGE_SIZE,
      take: CATALOG_PAGE_SIZE,
      select: cardSelect,
    }),
  ]);
  return {
    rows: rows.map(toCard),
    total,
    page,
    pages: Math.max(1, Math.ceil(total / CATALOG_PAGE_SIZE)),
  };
}

export async function listPublicModelPaths() {
  return prisma.mirrorModel.findMany({
    where: sellableModelWhere,
    select: {
      slug: true,
      updatedAt: true,
      category: { select: { slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function catalogFacets() {
  const rows = await prisma.mirrorModel.findMany({
    where: sellableModelWhere,
    select: {
      shapeId: true,
      shapeLabel: true,
      category: { select: { name: true, slug: true, description: true } },
    },
    orderBy: { name: "asc" },
  });
  const categories = new Map<string, { name: string; slug: string; description: string | null }>();
  const shapes = new Map<string, string>();
  for (const row of rows) {
    categories.set(row.category.slug, row.category);
    shapes.set(row.shapeId, row.shapeLabel);
  }
  return {
    categories: [...categories.values()],
    shapes: [...shapes.entries()].map(([id, label]) => ({ id, label })),
  };
}

export async function isSellableModel(modelId: string): Promise<boolean> {
  const row = await prisma.mirrorModel.findFirst({
    where: { id: modelId, ...sellableModelWhere },
    select: { id: true },
  });
  return row != null;
}

export async function findSellableBySlug(slug: string) {
  return prisma.mirrorModel.findFirst({
    where: { slug, ...sellableModelWhere },
    select: {
      id: true,
      slug: true,
      name: true,
      code: true,
      shortDescription: true,
      seoTitle: true,
      seoDescription: true,
      retailPrice: true,
      updatedAt: true,
    },
  });
}

/** Previous public slug of a model that is still for sale. */
export async function findPublicSlugRedirect(slug: string): Promise<string | null> {
  const redirect = await prisma.mirrorModelSlugRedirect.findUnique({
    where: { slug },
    select: { model: { select: { slug: true, status: true, isPublished: true, calcStatus: true, retailPrice: true } } },
  });
  const model = redirect?.model;
  if (
    !model ||
    model.status !== "ACTIVE" ||
    !model.isPublished ||
    model.calcStatus !== "COMPLETE" ||
    model.retailPrice == null ||
    model.slug === slug
  ) {
    return null;
  }
  return model.slug;
}

export async function publicImageAllowed(modelId: string, variant: string): Promise<boolean> {
  if (variant !== "display" && variant !== "thumb") {
    return false;
  }
  return isSellableModel(modelId);
}
