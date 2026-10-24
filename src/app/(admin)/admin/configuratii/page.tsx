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
import { listSavedConfigurations } from "@/modules/offers/queries";
import { CONFIG_STATUS_LABEL } from "@/modules/offers/status";
import { ConfigurationsFilters } from "@/components/offers/configurations-filters";
import { ConfigRowActions } from "@/components/offers/config-row-actions";

export const metadata = {
  title: "Configurații salvate",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    order?: string;
  }>;
};

function money(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Number(value).toFixed(2)} MDL`;
}

export default async function ConfiguratiiPage({ searchParams }: PageProps) {
  await requireStaffSession();
  const params = searchParams ? await searchParams : {};
  const status =
    params.status === "DRAFT" ||
    params.status === "COMPLETE" ||
    params.status === "INCOMPLETE"
      ? params.status
      : "ALL";
  const sort =
    params.sort === "name" ||
    params.sort === "code" ||
    params.sort === "sinecost" ||
    params.sort === "retailPrice"
      ? params.sort
      : "updatedAt";
  const order = params.order === "asc" ? "asc" : "desc";

  const rows = await listSavedConfigurations({
    q: params.q ?? "",
    status,
    sort,
    order,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurații salvate"
        description="Căutare, filtrare și deschidere în configuratorul profesional."
      />

      <ConfigurationsFilters
        q={params.q ?? ""}
        status={status}
        sort={sort}
        order={order}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cod</TableHead>
              <TableHead>Nume</TableHead>
              <TableHead>Dimensiuni</TableHead>
              <TableHead>Formă</TableHead>
              <TableHead>Sinecost</TableHead>
              <TableHead>En-gros</TableHead>
              <TableHead>Retail</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modificat</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-muted-foreground">
                  Nicio configurație salvată.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/configurator?id=${row.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>
                    {Number(row.widthMm)} × {Number(row.heightMm)} mm
                  </TableCell>
                  <TableCell>{row.shapeLabel}</TableCell>
                  <TableCell>{money(row.sinecost)}</TableCell>
                  <TableCell>{money(row.wholesalePrice)}</TableCell>
                  <TableCell>{money(row.retailPrice)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CONFIG_STATUS_LABEL[row.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.updatedAt.toLocaleString("ro-RO")}
                  </TableCell>
                  <TableCell className="text-xs">
                    {row.updatedBy.name ?? row.updatedBy.email}
                  </TableCell>
                  <TableCell>
                    <ConfigRowActions id={row.id} />
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
