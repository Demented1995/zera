import Link from "next/link";

import { ModelsFilters } from "@/components/catalog/models-filters";
import { ModelRowActions } from "@/components/catalog/model-row-actions";
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
import { canManageCatalog } from "@/modules/catalog/permissions";
import {
  listMirrorCategories,
  listMirrorModels,
} from "@/modules/catalog/queries";
import {
  CALC_STATUS_LABEL,
  MODEL_STATUS_LABEL,
} from "@/modules/catalog/status";

export const metadata = {
  title: "Modele de oglinzi",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    categoryId?: string;
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

export default async function ModelePage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  const canManage = canManageCatalog(session.user.role);
  const params = searchParams ? await searchParams : {};

  const status =
    params.status === "DRAFT" ||
    params.status === "ACTIVE" ||
    params.status === "ARCHIVED"
      ? params.status
      : "ALL";
  const sort = params.sort === "name" ? "name" : "updatedAt";
  const order = params.order === "asc" ? "asc" : "desc";
  const categoryId = params.categoryId?.trim() || "ALL";

  const [categories, rows] = await Promise.all([
    listMirrorCategories(),
    listMirrorModels({
      q: params.q ?? "",
      status,
      categoryId,
      sort,
      order,
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modele de oglinzi"
        description="Catalog comercial de modele predefinite. Prețurile vin din motorul central — fără preț fix manual. Activ ≠ publicat pe site."
        actions={
          canManage ? (
            <Link
              href="/admin/modele/nou"
              className="inline-flex h-8 items-center rounded-lg bg-primary px-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Adaugă model
            </Link>
          ) : null
        }
      />

      <ModelsFilters
        q={params.q ?? ""}
        status={status}
        categoryId={categoryId}
        sort={sort}
        order={order}
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
        }))}
      />

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Cod</TableHead>
              <TableHead>Nume</TableHead>
              <TableHead>Categorie</TableHead>
              <TableHead>Tehnic</TableHead>
              <TableHead>Sinecost</TableHead>
              <TableHead>En-gros</TableHead>
              <TableHead>Retail</TableHead>
              <TableHead>Calcul</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modificat</TableHead>
              <TableHead>Acțiuni</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="text-muted-foreground">
                  Niciun model comercial.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    {row.images[0] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/api/media/${row.id}/${row.images[0].id}/thumb`}
                          alt=""
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      </>
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted text-[10px] text-muted-foreground">
                        —
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/modele/${row.id}`}
                      className="underline-offset-2 hover:underline"
                    >
                      {row.code}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">
                      /{row.slug}
                    </div>
                  </TableCell>
                  <TableCell>{row.category.name}</TableCell>
                  <TableCell className="text-xs">
                    {row.shapeLabel}
                    <br />
                    {Number(row.defaultWidthMm)} × {Number(row.defaultHeightMm)}{" "}
                    mm
                  </TableCell>
                  <TableCell>{money(row.sinecost)}</TableCell>
                  <TableCell>{money(row.wholesalePrice)}</TableCell>
                  <TableCell>{money(row.retailPrice)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {CALC_STATUS_LABEL[row.calcStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {MODEL_STATUS_LABEL[row.status]}
                    </Badge>
                    {row.isPublished ? (
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        publicat
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                    {row.updatedAt.toLocaleString("ro-RO")}
                    <br />
                    {row.updatedBy.name ?? row.updatedBy.email}
                  </TableCell>
                  <TableCell>
                    <ModelRowActions
                      id={row.id}
                      status={row.status}
                      canManage={canManage}
                    />
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
