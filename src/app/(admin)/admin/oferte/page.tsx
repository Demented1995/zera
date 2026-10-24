import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireStaffSession } from "@/lib/auth/guards";
import { listOffers } from "@/modules/offers/queries";
import { OFFER_STATUS_LABEL } from "@/modules/offers/status";

export const metadata = {
  title: "Oferte | ZERA",
};

function money(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Number(value).toFixed(2)} MDL`;
}

export default async function OfertePage() {
  await requireStaffSession();
  const rows = await listOffers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oferte clienți"
        description="Oferte comerciale cu snapshot imutabil la emitere. Nu se convertesc automat în comenzi."
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Număr</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Produs</TableHead>
              <TableHead>Config</TableHead>
              <TableHead>Total (ultima rev.)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emisă</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  Nicio ofertă. Creați una din configurator.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.number}</TableCell>
                  <TableCell>
                    <div>{row.clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.clientPhone}
                    </div>
                  </TableCell>
                  <TableCell>{row.productName}</TableCell>
                  <TableCell className="text-xs">
                    {row.configuration?.code ?? "—"}
                  </TableCell>
                  <TableCell>
                    {money(row.revisions[0]?.offerTotal ?? null)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {OFFER_STATUS_LABEL[row.displayStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {row.issuedAt
                      ? row.issuedAt.toLocaleDateString("ro-RO")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/oferte/${row.id}`}
                      className="text-sm underline-offset-2 hover:underline"
                    >
                      Detalii
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
