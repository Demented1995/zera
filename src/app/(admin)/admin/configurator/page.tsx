import { PageHeader } from "@/components/admin/page-header";
import { ConfiguratorWorkspace } from "@/components/configurator/configurator-workspace";
import { requireStaffSession } from "@/lib/auth/guards";

export const metadata = {
  title: "Configurator profesional | ZERA",
};

export default async function ConfiguratorPage() {
  const session = await requireStaffSession();
  const canOverrideLedLength = session.user.role === "ADMIN";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurator profesional"
        description="Stage 5.2 — formă, dimensiuni și iluminare LED / componente electrice. Defog, rame, livrare și comenzi urmează în etapele următoare."
      />
      <ConfiguratorWorkspace canOverrideLedLength={canOverrideLedLength} />
    </div>
  );
}
