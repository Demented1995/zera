import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { CustomerFilters } from "@/components/customers/customer-filters";
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
import { canManageCustomers } from "@/modules/customers/permissions";
import { listCustomers } from "@/modules/customers/queries";
import type { CustomerKind, CustomerStatus } from "@prisma/client";

export const metadata = {
  title: "Clienți",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    kind?: string;
    status?: string;
    sort?: string;
    order?: string;
    page?: string;
  }>;
};

const KIND_LABEL: Record<CustomerKind, string> = {
  INDIVIDUAL: "Fizică",
  COMPANY: "Juridică",
};

const STATUS_LABEL: Record<CustomerStatus, string> = {
  ACTIVE: "Activ",
  ARCHIVED: "Arhivat",
};

function asKind(value: string | undefined): CustomerKind | "ALL" {
  return value === "INDIVIDUAL" || value === "COMPANY" ? value : "ALL";
}

function asStatus(value: string | undefined): CustomerStatus | "ALL" {
  if (value === "ARCHIVED" || value === "ALL") {
    return value;
  }
  return "ACTIVE";
}

function asSort(value: string | undefined): "updatedAt" | "displayName" | "createdAt" {
  return value === "displayName" || value === "createdAt" ? value : "updatedAt";
}

export default async function ClientiPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    redirect("/admin");
  }
  const params = searchParams ? await searchParams : {};
  const kind = asKind(params.kind);
  const status = asStatus(params.status);
  const sort = asSort(params.sort);
  const order = params.order === "asc" ? "asc" : "desc";
  const page = Number(params.page);
  const result = await listCustomers({
    q: params.q ?? "",
    kind,
    status,
    sort,
    order,
    page: Number.isFinite(page) ? page : 1,
  });

  function hrefFor(nextPage: number) {
    const search = new URLSearchParams();
    if (params.q?.trim()) {
      search.set("q", params.q.trim());
    }
    if (kind !== "ALL") {
      search.set("kind", kind);
    }
    if (status !== "ACTIVE") {
      search.set("status", status);
    }
    search.set("sort", sort);
    search.set("order", order);
    search.set("page", String(nextPage));
    return `/admin/clienti?${search.toString()}`;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clienți"
        description="Registrul clienților. Ofertele și comenzile își păstrează datele de contact și se asociază manual."
        actions={
          <Link
            href="/admin/clienti/nou"
            className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Adaugă client
          </Link>
        }
      />

      <CustomerFilters
        q={params.q ?? ""}
        kind={kind}
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
              <TableHead>Tip</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Adresă</TableHead>
              <TableHead>Oferte</TableHead>
              <TableHead>Stare</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  Niciun client pentru filtrele alese.
                </TableCell>
              </TableRow>
            ) : (
              result.rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/clienti/${row.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div>{row.displayName}</div>
                    {row.companyName ? (
                      <div className="text-xs text-muted-foreground">{row.companyName}</div>
                    ) : null}
                  </TableCell>
                  <TableCell>{KIND_LABEL[row.kind]}</TableCell>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.email ?? "—"}</TableCell>
                  <TableCell className="max-w-48 text-sm">
                    {row.addresses[0]
                      ? [row.addresses[0].line, row.addresses[0].city].filter(Boolean).join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell>{row._count.offers}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{STATUS_LABEL[row.status]}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {result.total} {result.total === 1 ? "client" : "clienți"} · pagina {result.page} din{" "}
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
