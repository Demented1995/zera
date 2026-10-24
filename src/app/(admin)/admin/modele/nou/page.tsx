import { ModelForm } from "@/components/catalog/model-form";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffSession } from "@/lib/auth/guards";
import { canManageCatalog } from "@/modules/catalog/permissions";
import { listMirrorCategories } from "@/modules/catalog/queries";
import { listSavedConfigurations } from "@/modules/offers/queries";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Model nou | ZERA",
};

export default async function ModelNouPage() {
  const session = await requireStaffSession();
  if (!canManageCatalog(session.user.role)) {
    redirect("/admin/modele");
  }

  const [categories, configs] = await Promise.all([
    listMirrorCategories({ activeOnly: true }),
    listSavedConfigurations({
      q: "",
      status: "ALL",
      sort: "updatedAt",
      order: "desc",
    }),
  ]);

  if (categories.length === 0) {
    redirect("/admin/categorii");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Model comercial nou"
        description="Definiți identitatea comercială și configurația tehnică implicită. Prețurile se calculează din motorul central."
      />
      <ModelForm
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
        savedConfigs={configs.slice(0, 50).map((config) => ({
          id: config.id,
          code: config.code,
          name: config.name,
        }))}
        canEditTariffs={session.user.role === "ADMIN"}
        canOverrideLedLength={session.user.role === "ADMIN"}
      />
    </div>
  );
}
