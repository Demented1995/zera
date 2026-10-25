import { prisma } from "@/lib/db/prisma";
import { MATERIAL_CURRENCY } from "@/modules/materials/constants";
import {
  UNPRICED_CATEGORIES,
  UNPRICED_MATERIALS,
} from "@/modules/materials/unpriced-catalog";

/** Create missing unpriced options. Never overwrites a category or a price already set. */
export async function ensureUnpricedCatalog(): Promise<void> {
  for (const category of UNPRICED_CATEGORIES) {
    await prisma.materialCategory.upsert({
      where: { slug: category.slug },
      update: {},
      create: {
        name: category.name,
        slug: category.slug,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });
  }

  const seedKeys = UNPRICED_MATERIALS.map((item) => item.seedKey);
  const [existing, dismissed] = await Promise.all([
    prisma.material.findMany({
      where: { seedKey: { in: seedKeys } },
      select: { seedKey: true },
    }),
    prisma.dismissedMaterialSeed.findMany({
      where: { seedKey: { in: seedKeys } },
      select: { seedKey: true },
    }),
  ]);
  const present = new Set(existing.map((item) => item.seedKey));
  const removed = new Set(dismissed.map((item) => item.seedKey));

  const missing = UNPRICED_MATERIALS.filter(
    (item) => !present.has(item.seedKey) && !removed.has(item.seedKey),
  );
  if (missing.length === 0) {
    return;
  }

  await prisma.material.createMany({
    data: missing.map((item) => ({
      seedKey: item.seedKey,
      name: item.name,
      categoryId: null,
      unitPrice: null,
      unitOfMeasure: item.unitOfMeasure,
      currency: MATERIAL_CURRENCY,
      isActive: true,
    })),
  });
}
