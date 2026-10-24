import { PageHeader } from "@/components/admin/page-header";
import { ConfiguratorWorkspace } from "@/components/configurator/configurator-workspace";
import { requireStaffSession } from "@/lib/auth/guards";

export const metadata = {
  title: "Configurator profesional | ZERA",
};

export default async function ConfiguratorPage() {
  await requireStaffSession();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurator profesional"
        description="Stage 5.1 — formă și dimensiuni. LED, accesorii și echiparea completă urmează în etapele următoare."
      />
      <ConfiguratorWorkspace />
    </div>
  );
}
