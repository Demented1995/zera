import {
  Activity,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Package,
} from "lucide-react";

import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";

export const metadata = {
  title: "Dashboard",
};

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Prezentare generală a activității. Indicatorii vor afișa valori reale când modulele de date vor fi disponibile."
      />

      <section
        aria-label="Indicatori principali"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard label="Număr comenzi" icon={ClipboardList} value={null} />
        <StatCard label="Valoare vânzări" icon={CircleDollarSign} value={null} />
        <StatCard
          label="Comenzi în producție"
          icon={Boxes}
          value={null}
        />
        <StatCard label="Produse active" icon={Package} value={null} />
      </section>

      <section aria-label="Activitate recentă" className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Activitate recentă</h2>
        <EmptyState
          icon={Activity}
          title="Date indisponibile"
          description="Nu există încă activitate înregistrată. Acest panou se va popula automat când vor exista evenimente reale în sistem."
        />
      </section>
    </div>
  );
}
