import { requireStaffSession } from "@/lib/auth/guards";
import { MaterialsView } from "@/components/materials/materials-view";
import { canManageMaterials } from "@/modules/materials/permissions";
import {
  listAllMaterialCategories,
  listMaterials,
} from "@/modules/materials/queries";
import {
  serializeCategory,
  serializeMaterial,
  serializePriceHistory,
} from "@/modules/materials/serialize";
import { prisma } from "@/lib/db/prisma";
import type { PriceHistoryDTO } from "@/modules/materials/types";

export const metadata = {
  title: "Materiale și componente | ZERA",
};

export default async function MaterialePage() {
  const session = await requireStaffSession();
  const canManage = canManageMaterials(session.user.role);

  const [categories, materials] = await Promise.all([
    listAllMaterialCategories(),
    listMaterials(),
  ]);

  const historyRows = await prisma.materialPriceHistory.findMany({
    where: {
      materialId: { in: materials.map((material) => material.id) },
    },
    include: {
      changedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { changedAt: "desc" },
  });

  const historyByMaterialId: Record<string, PriceHistoryDTO[]> = {};
  for (const row of historyRows) {
    const list = historyByMaterialId[row.materialId] ?? [];
    list.push(serializePriceHistory(row));
    historyByMaterialId[row.materialId] = list;
  }

  return (
    <MaterialsView
      canManage={canManage}
      categories={categories.map(serializeCategory)}
      materials={materials.map(serializeMaterial)}
      historyByMaterialId={historyByMaterialId}
    />
  );
}
