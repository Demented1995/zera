import Link from "next/link";

import { PageHeader } from "@/components/admin/page-header";
import { OrderFilters } from "@/components/orders/order-filters";
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
import { canManageOrders } from "@/modules/orders/permissions";
import { listOrders } from "@/modules/orders/queries";
import { formatMdl, ORDER_STATUS_LABEL, orderBalance } from "@/modules/orders/public";
import type { OrderStatus } from "@prisma/client";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Comenzi",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    page?: string;
  }>;
};

function asStatus(value: string | undefined): OrderStatus | "ALL" {
  if (value && value in ORDER_STATUS_LABEL) {
    return value as OrderStatus;
  }
  return "ALL";
}

export default async function ComenziPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    redirect("/admin");
  }
  const params = searchParams ? await searchParams : {};
  const status = asStatus(params.status);
  const page = Number(params.page);
  const result = await listOrders({
    q: params.q ?? "",
    status,
    page: Number.isFinite(page) ? page : 1,
  });

  function hrefFor(nextPage: number) {
    const search = new URLSearchParams();
    if (params.q?.trim()) {
      search.set("q", params.q.trim());
    }
    if (status !== "ALL") {
      search.set("status", status);
    }
    search.set("page", String(nextPage));
    return `/admin/comenzi?${search.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comenzi"
        description="Comenzile plasate din configurator. Prețul și configurația rămân cele din momentul plasării."
      />
      <OrderFilters q={params.q ?? ""} status={status} />
      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Număr</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Preț</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-muted-foreground">
                  Nicio comandă pentru filtrele alese.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => {
                const retail = Number(row.retailPrice);
                const advance = Number(row.advanceAmount);
                return (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/comenzi/${row.id}`}
                        className="underline-offset-2 hover:underline"
                      >
                        {row.number}
                      </Link>
                    </TableCell>
                    <TableCell>{row.customerName}</TableCell>
                    <TableCell>{row.customerPhone}</TableCell>
                    <TableCell>
                      <div>{row.modelName}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.modelCode}
                        {row._count.lines > 1 ? ` · ${row._count.lines} produse` : ""}
                      </div>
                    </TableCell>
                    <TableCell>{formatMdl(retail)}</TableCell>
                    <TableCell>{formatMdl(orderBalance(retail, advance))}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ORDER_STATUS_LABEL[row.status]}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {result.total} {result.total === 1 ? "comandă" : "comenzi"} · pagina {result.page} din{" "}
          {result.pages}
        </p>
        <div className="flex gap-3">
          {result.page > 1 ? (
            <Link href={hrefFor(result.page - 1)} className="underline-offset-2 hover:underline">
              Pagina anterioară
            </Link>
          ) : null}
          {result.page < result.pages ? (
            <Link href={hrefFor(result.page + 1)} className="underline-offset-2 hover:underline">
              Pagina următoare
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
