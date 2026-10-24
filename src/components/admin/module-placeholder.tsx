import { Construction } from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";

type ModulePlaceholderProps = {
  title: string;
  description?: string;
};

export function ModulePlaceholder({
  title,
  description,
}: ModulePlaceholderProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={Construction}
        title="Modul în curs de dezvoltare"
        description="Această secțiune va fi disponibilă într-o etapă ulterioară. Nu există date sau acțiuni active aici momentan."
      />
    </div>
  );
}
