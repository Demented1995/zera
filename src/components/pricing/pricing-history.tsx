import { EmptyState } from "@/components/admin/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PricingHistoryDTO } from "@/modules/pricing/serialize";

type PricingHistoryProps = {
  history: PricingHistoryDTO[];
};

export function PricingHistory({ history }: PricingHistoryProps) {
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Istoric modificări reguli
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Doar pentru citire — modificările nu pot fi editate sau șterse din UI.
        </p>
      </div>

      {history.length === 0 ? (
        <EmptyState
          title="Nicio modificare încă"
          description="Istoricul apare când un administrator salvează regulile globale."
          className="py-10"
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Câmp</TableHead>
                <TableHead>Înainte</TableHead>
                <TableHead>După</TableHead>
                <TableHead>Utilizator</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {new Date(entry.changedAt).toLocaleString("ro-RO")}
                  </TableCell>
                  <TableCell className="text-sm">{entry.fieldLabel}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {entry.previousValue ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{entry.newValue ?? "—"}</TableCell>
                  <TableCell className="text-sm">
                    <div className="flex flex-col">
                      <span>{entry.changedByName}</span>
                      <span className="text-xs text-muted-foreground">
                        {entry.changedByEmail}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
