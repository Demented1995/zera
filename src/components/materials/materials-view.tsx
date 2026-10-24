"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { History, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesPanel } from "@/components/materials/categories-panel";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { PriceHistoryDialog } from "@/components/materials/price-history-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { setMaterialActiveAction } from "@/modules/materials/actions";
import { UNCONFIRMED_UOM } from "@/modules/materials/constants";
import { formatMaterialPrice } from "@/modules/materials/format";
import type {
  MaterialCategoryDTO,
  MaterialDTO,
  PriceHistoryDTO,
} from "@/modules/materials/types";

type MaterialsViewProps = {
  materials: MaterialDTO[];
  categories: MaterialCategoryDTO[];
  canManage: boolean;
  historyByMaterialId: Record<string, PriceHistoryDTO[]>;
};

export function MaterialsView({
  materials,
  categories,
  canManage,
  historyByMaterialId,
}: MaterialsViewProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialDTO | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<MaterialDTO | null>(
    null,
  );
  const [deactivateTarget, setDeactivateTarget] = useState<MaterialDTO | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return materials.filter((material) => {
      if (categoryId !== "all" && material.categoryId !== categoryId) {
        return false;
      }
      if (status === "active" && !material.isActive) {
        return false;
      }
      if (status === "inactive" && material.isActive) {
        return false;
      }
      if (!q) {
        return true;
      }
      return (
        material.name.toLowerCase().includes(q) ||
        (material.internalCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [materials, query, categoryId, status]);

  function refresh() {
    router.refresh();
  }

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(material: MaterialDTO) {
    setEditing(material);
    setFormOpen(true);
  }

  function confirmDeactivate() {
    if (!deactivateTarget) {
      return;
    }
    startTransition(async () => {
      const result = await setMaterialActiveAction(deactivateTarget.id, false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDeactivateTarget(null);
      refresh();
    });
  }

  function reactivate(material: MaterialDTO) {
    startTransition(async () => {
      const result = await setMaterialActiveAction(material.id, true);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
    });
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Materiale și componente"
        description="Catalog de materiale, componente și operațiuni cu prețuri în MDL. Managerii pot doar vizualiza."
        actions={
          canManage ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              Adaugă material
            </Button>
          ) : null
        }
      />

      <CategoriesPanel
        categories={categories}
        canManage={canManage}
        onChanged={refresh}
      />

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Caută după nume sau cod intern"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Filtru categorie"
          >
            <option value="all">Toate categoriile</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as "all" | "active" | "inactive")
            }
            aria-label="Filtru status"
          >
            <option value="all">Toate statusurile</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title="Niciun material găsit"
            description="Ajustați filtrele sau adăugați un material nou."
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nume</TableHead>
                  <TableHead>Cod</TableHead>
                  <TableHead>Categorie</TableHead>
                  <TableHead>Preț</TableHead>
                  <TableHead>U.M.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Acțiuni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((material) => (
                  <TableRow key={material.id}>
                    <TableCell className="max-w-[220px]">
                      <div className="font-medium">{material.name}</div>
                      {material.description ? (
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {material.description}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {material.internalCode || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {material.categoryName}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {formatMaterialPrice(
                        material.unitPrice,
                        material.currency,
                        material.unitOfMeasure,
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {material.unitOfMeasure === UNCONFIRMED_UOM ? (
                        <Badge variant="outline">neconfirmat</Badge>
                      ) : (
                        material.unitOfMeasure
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={material.isActive ? "secondary" : "outline"}
                      >
                        {material.isActive ? "Activ" : "Inactiv"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          title="Istoric prețuri"
                          onClick={() => setHistoryMaterial(material)}
                        >
                          <History className="size-4" />
                        </Button>
                        {canManage ? (
                          <>
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              title="Editează"
                              onClick={() => openEdit(material)}
                              disabled={pending}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            {material.isActive ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setDeactivateTarget(material)}
                                disabled={pending}
                              >
                                Dezactivează
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => reactivate(material)}
                                disabled={pending}
                              >
                                Reactivează
                              </Button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {canManage ? (
        <MaterialFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          categories={categories}
          material={editing}
          onSaved={refresh}
        />
      ) : null}

      <PriceHistoryDialog
        open={Boolean(historyMaterial)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryMaterial(null);
          }
        }}
        materialName={historyMaterial?.name ?? ""}
        history={
          historyMaterial
            ? (historyByMaterialId[historyMaterial.id] ?? [])
            : []
        }
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeactivateTarget(null);
          }
        }}
        title="Dezactivați materialul?"
        description={
          deactivateTarget
            ? `„${deactivateTarget.name}” va fi dezactivat (soft). Nu va fi șters din baza de date.`
            : undefined
        }
        confirmLabel="Dezactivează"
        destructive
        pending={pending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
