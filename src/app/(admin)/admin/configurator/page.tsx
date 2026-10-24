import { PageHeader } from "@/components/admin/page-header";
import { ConfiguratorWorkspace } from "@/components/configurator/configurator-workspace";
import { requireStaffSession } from "@/lib/auth/guards";
import { getMirrorModel } from "@/modules/catalog/queries";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { getSavedConfiguration } from "@/modules/offers/queries";

export const metadata = {
  title: "Configurator profesional | ZERA",
};

type PageProps = {
  searchParams?: Promise<{ id?: string; modelId?: string }>;
};

export default async function ConfiguratorPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  const isAdmin = session.user.role === "ADMIN";
  const params = searchParams ? await searchParams : {};
  const id = params.id;
  const modelId = params.modelId;

  let initialState: ConfiguratorState | null = null;
  let initialConfigId: string | null = null;
  let initialConfigCode: string | null = null;
  let initialConfigName: string | null = null;

  if (id) {
    const saved = await getSavedConfiguration(id);
    if (saved) {
      initialConfigId = saved.id;
      initialConfigCode = saved.code;
      initialConfigName = saved.name;
      initialState = saved.configJson as unknown as ConfiguratorState;
    }
  } else if (modelId) {
    // Load commercial model defaults into the professional configurator (working copy).
    // Does not mutate the catalog model or issued offer history.
    const model = await getMirrorModel(modelId);
    if (model) {
      initialConfigName = `Lucru — ${model.name}`;
      initialState = model.configJson as unknown as ConfiguratorState;
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurator profesional"
        description="Configurare oglinzi, salvare, oferte. Modelele comerciale se gestionează separat în Modele de oglinzi."
      />
      <ConfiguratorWorkspace
        canOverrideLedLength={isAdmin}
        canEditTariffs={isAdmin}
        initialConfigId={initialConfigId}
        initialConfigCode={initialConfigCode}
        initialConfigName={initialConfigName}
        initialState={initialState}
      />
    </div>
  );
}
