import { CategoriesManager } from "@/components/catalog/categories-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { canManageCatalog } from "@/modules/catalog/permissions";

export const metadata = {
  title: "Categorii comerciale",
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
        description="Categorii pentru modelele de oglinzi. De aici alegi până la 4 categorii pentru centrul paginii principale."
      />
      <CategoriesManager categories={categories} canManage={canManage} />
    </div>
  );
}
