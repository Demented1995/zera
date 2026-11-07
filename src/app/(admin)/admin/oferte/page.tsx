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
import { listSiteRequests } from "@/modules/orders/queries";
import { CUSTOM_PROJECT_CODE, formatMdl, siteRequestLabel } from "@/modules/orders/public";

export const metadata = {
  title: "Oferte",
};

function money(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Number(value).toFixed(2)} MDL`;
}

export default async function OfertePage() {
  await requireStaffSession();
  const [rows, requests] = await Promise.all([listOffers(), listSiteRequests()]);
  const unopened = requests.filter((request) => request.openedAt == null).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Oferte clienți"
        description="Solicitările din site ajung aici. O ofertă comercială emisă din configurator rămâne neschimbată. Din solicitare poți trimite comanda la producere, cu datele deja completate."
      />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-medium tracking-tight">Solicitări din site</h2>
          {unopened > 0 ? (
            <Badge>+{unopened}</Badge>
          ) : null}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Număr</TableHead>
                <TableHead>Sursă</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Produs</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Primită</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-muted-foreground">
                    Nicio solicitare nouă din site.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {request.number}
                        {request.openedAt == null ? <Badge>+1</Badge> : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      {siteRequestLabel({
                        deliveryAddress: request.deliveryAddress,
                        note: request.statusEvents[0]?.note,
                      })}
                    </TableCell>
                    <TableCell>
                      <div>{request.customerName}</div>
                      <div className="text-xs text-muted-foreground">{request.customerPhone}</div>
                    </TableCell>
                    <TableCell>{request.modelName}</TableCell>
                    <TableCell>
                      {request.modelCode === CUSTOM_PROJECT_CODE
                        ? "—"
                        : formatMdl(Number(request.retailPrice))}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("ro-RO", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(request.placedAt)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/oferte/solicitari/${request.id}`}
                        className="text-sm underline-offset-2 hover:underline"
                      >
                        Deschide
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <h2 className="text-lg font-medium tracking-tight">Oferte din configurator</h2>

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
