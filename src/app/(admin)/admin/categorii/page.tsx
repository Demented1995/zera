import { CategoriesManager } from "@/components/catalog/categories-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { canManageCatalog } from "@/modules/catalog/permissions";

export const metadata = {
  title: "Categorii comerciale | ZERA",
};

export default async function CategoriiPage() {
  const session = await requireStaffSession();
  const canManage = canManageCatalog(session.user.role);

  const categories = await prisma.mirrorModelCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { models: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorii comerciale"
        description="Categorii pentru modelele de oglinzi (distincte de categoriile de materiale Stage 3)."
      />
      <CategoriesManager categories={categories} canManage={canManage} />
    </div>
  );
}
