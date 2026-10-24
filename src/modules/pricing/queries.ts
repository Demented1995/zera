import { prisma } from "@/lib/db/prisma";
import type { CatalogMaterial, PricingRules } from "@/modules/pricing/engine";
import { MATERIAL_SEED_KEYS } from "@/modules/pricing/engine";

export async function getPricingSettings() {
  const existing = await prisma.pricingSettings.findUnique({
    where: { id: "default" },
  });

  if (existing) {
    return existing;
  }

  return prisma.pricingSettings.create({
    data: { id: "default" },
  });
}

export async function getPricingSettingsHistory(limit = 50) {
  return prisma.pricingSettingsHistory.findMany({
    take: limit,
    orderBy: { changedAt: "desc" },
    include: {
      changedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function loadCatalogMaterialsForEngine(): Promise<CatalogMaterial[]> {
  const seedKeys = Object.values(MATERIAL_SEED_KEYS);
  const materials = await prisma.material.findMany({
    where: { seedKey: { in: [...seedKeys] } },
  });

  return materials
    .filter((material): material is typeof material & { seedKey: string } =>
      Boolean(material.seedKey),
    )
    .map((material) => ({
      seedKey: material.seedKey,
      name: material.name,
      unitPrice: material.unitPrice === null ? null : Number(material.unitPrice),
      unitOfMeasure: material.unitOfMeasure,
      isActive: material.isActive,
    }));
}

export function toPricingRules(settings: {
  wholesaleMarkupPercent: { toString(): string } | number;
  retailMarkupPercent: { toString(): string } | number;
  curvedEdgeAddMm: { toString(): string } | number;
  sandblastMinCharge: { toString(): string } | number;
}): PricingRules {
  return {
    wholesaleMarkupPercent: Number(settings.wholesaleMarkupPercent),
    retailMarkupPercent: Number(settings.retailMarkupPercent),
    curvedEdgeAddMm: Number(settings.curvedEdgeAddMm),
    sandblastMinCharge: Number(settings.sandblastMinCharge),
  };
}
