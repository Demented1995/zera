import { notFound, redirect } from "next/navigation";

import { ModelForm } from "@/components/catalog/model-form";
import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import {
  canManageCatalog,
  canManageConfiguratorRules,
} from "@/modules/catalog/permissions";
import {
  getMirrorModel,
  listMirrorCategories,
} from "@/modules/catalog/queries";
import {
  CALC_STATUS_LABEL,
  MODEL_STATUS_LABEL,
} from "@/modules/catalog/status";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { listSavedConfigurations } from "@/modules/offers/queries";

export const metadata = {
  title: "Editare model | ZERA",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModelEditPage({ params }: PageProps) {
  const session = await requireStaffSession();
  const { id } = await params;
  const model = await getMirrorModel(id);
  if (!model) {
    notFound();
  }

  const canManage = canManageCatalog(session.user.role);
  if (!canManage) {
    // Managers may view summary via list + open in configurator; edit form is ADMIN.
    redirect(`/admin/configurator?modelId=${model.id}`);
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

  const categoryOptions = [
    ...categories.map((category) => ({
      id: category.id,
      name: category.name,
    })),
  ];
  if (!categoryOptions.some((category) => category.id === model.categoryId)) {
    categoryOptions.unshift({
      id: model.category.id,
      name: `${model.category.name} (inactivă)`,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={model.name}
        description="Editarea modelului nu alterează ofertele emise — snapshot-urile comerciale rămân imutabile."
      />
      <div className="flex flex-wrap gap-2 text-sm">
        <Badge variant="outline">{MODEL_STATUS_LABEL[model.status]}</Badge>
        <Badge variant="outline">{CALC_STATUS_LABEL[model.calcStatus]}</Badge>
        <span className="text-muted-foreground">
          {model._count.offers} oferte legate · publicat pe site:{" "}
          {model.isPublished ? "da" : "nu"}
        </span>
      </div>
      <ModelForm
        categories={categoryOptions}
        savedConfigs={configs.slice(0, 50).map((config) => ({
          id: config.id,
          code: config.code,
          name: config.name,
        }))}
        canEditTariffs={session.user.role === "ADMIN"}
        canOverrideLedLength={session.user.role === "ADMIN"}
        canManageRules={canManageConfiguratorRules(session.user.role)}
        initial={{
          id: model.id,
          code: model.code,
          name: model.name,
          slug: model.slug,
          shortDescription: model.shortDescription,
          fullDescription: model.fullDescription,
          categoryId: model.categoryId,
          status: model.status,
          config: model.configJson as unknown as ConfiguratorState,
          sourceConfigurationId: model.sourceConfigurationId,
          configuratorRulesJson: model.configuratorRulesJson,
          rulesVersion: model.rulesVersion,
          defaultWidthMm: Number(model.defaultWidthMm),
          defaultHeightMm: Number(model.defaultHeightMm),
        }}
      />
    </div>
  );
}
