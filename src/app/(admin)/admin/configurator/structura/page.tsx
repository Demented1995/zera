import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { LayoutEditor } from "@/components/configurator/layout-editor";
import { requireStaffSession } from "@/lib/auth/guards";
import { getConfiguratorLayout } from "@/modules/configurator/layout-store";

export const metadata = {
  title: "Structura configuratorului",
};

export default async function ConfiguratorLayoutPage() {
  await requireStaffSession();
  const sections = await getConfiguratorLayout();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Structura configuratorului"
        description="Alege categoriile și elementele din ele, apoi trage-le în ordinea dorită. Alegerea rămâne în configuratorul profesional și la configurația tehnică a modelelor."
        actions={
          <Link
            href="/admin/configurator"
            className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
          >
            Deschide configuratorul
          </Link>
        }
      />
      <LayoutEditor initial={sections} />
    </div>
  );
}
