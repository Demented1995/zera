"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderTree, History, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { CategoriesDialog } from "@/components/materials/categories-dialog";
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
import {
  assignMaterialCategoryAction,
  deleteMaterialAction,
  setMaterialActiveAction,
  setMaterialPriceAction,
  setMaterialUnitAction,
} from "@/modules/materials/actions";
import { MATERIAL_UNITS, UNCONFIRMED_UOM } from "@/modules/materials/constants";
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

type MaterialGroup = {
  categoryId: string;
  categoryName: string;
  categoryActive: boolean;
  sortOrder: number;
  materials: MaterialDTO[];
};

function hasUnconfirmedPrice(material: MaterialDTO) {
  return material.unitPrice === null || material.unitPrice === "";
}

function hasUnconfirmedUom(material: MaterialDTO) {
  return material.unitOfMeasure === UNCONFIRMED_UOM;
}

function needsAttention(material: MaterialDTO) {
  return hasUnconfirmedPrice(material) || hasUnconfirmedUom(material);
}

const attentionRowClass =
  "!bg-[#722F37] !text-white hover:!bg-[#5e2430] [&_button]:!text-white [&_input]:bg-white [&_input]:!text-neutral-900 [&_select]:bg-white [&_select]:!text-neutral-900 [&_[data-slot=badge]]:border-white/70 [&_[data-slot=badge]]:bg-white/15 [&_[data-slot=badge]]:text-white";

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
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [editing, setEditing] = useState<MaterialDTO | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<MaterialDTO | null>(
    null,
  );
  const [deactivateTarget, setDeactivateTarget] = useState<MaterialDTO | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] = useState<MaterialDTO | null>(null);
  const [pending, startTransition] = useTransition();

  const categoryById = useMemo(() => {
    const map = new Map(categories.map((category) => [category.id, category]));
    return map;
  }, [categories]);

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

  const unpriced = useMemo(
    () => filtered.filter((material) => material.categoryId == null),
    [filtered],
  );

  const grouped = useMemo(() => {
    const groups = new Map<string, MaterialGroup>();

    for (const material of filtered) {
      if (!material.categoryId) {
        continue;
      }
      const category = categoryById.get(material.categoryId);
      const key = material.categoryId;
      const existing = groups.get(key);
      if (existing) {
        existing.materials.push(material);
        continue;
      }

      groups.set(key, {
        categoryId: key,
        categoryName: category?.name ?? material.categoryName ?? "Fără categorie",
        categoryActive: category?.isActive ?? true,
        sortOrder: category?.sortOrder ?? Number.MAX_SAFE_INTEGER,
        materials: [material],
      });
    }

    return [...groups.values()].sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      return a.categoryName.localeCompare(b.categoryName, "ro");
    });
  }, [filtered, categoryById]);

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

  function changePrice(material: MaterialDTO, rawPrice: string) {
    startTransition(async () => {
      const result = await setMaterialPriceAction(material.id, rawPrice);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      if (result.message !== "Prețul este neschimbat.") {
        toast.success(result.message);
      }
      refresh();
    });
  }

  function changeUnit(material: MaterialDTO, unitOfMeasure: string) {
    if (!unitOfMeasure || unitOfMeasure === material.unitOfMeasure) {
      return;
    }
    startTransition(async () => {
      const result = await setMaterialUnitAction(material.id, unitOfMeasure);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      refresh();
    });
  }

  function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    startTransition(async () => {
      const result = await deleteMaterialAction(deleteTarget.id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDeleteTarget(null);
      refresh();
    });
  }

  function assignCategory(material: MaterialDTO, nextCategoryId: string) {
    if (!nextCategoryId) {
      return;
    }
    startTransition(async () => {
      const result = await assignMaterialCategoryAction(material.id, nextCategoryId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
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
        description="Prețuri și unități de măsură pe categorii. Managerii pot doar vizualiza."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoriesOpen(true)}
            >
              <FolderTree className="size-4" />
              Gestionează categoriile
            </Button>
            {canManage ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="size-4" />
                Adaugă material
              </Button>
            ) : null}
          </div>
        }
      />

      <section className="space-y-6">
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

        {unpriced.length === 0 && grouped.length === 0 ? (
          <EmptyState
            title="Niciun material găsit"
            description="Ajustați filtrele sau adăugați un material nou."
          />
        ) : (
          <div className="space-y-6">
            {unpriced.length > 0 ? (
              <section className="overflow-hidden rounded-xl border border-[#722F37] bg-[#722F37]">
                <div className="flex items-center justify-between gap-3 border-b border-[#722F37] bg-[#722F37] px-4 py-3 text-white">
                  <h2 className="text-sm font-semibold tracking-tight">
                    Fără preț
                  </h2>
                  <span className="shrink-0 text-xs text-white/80">
                    {unpriced.length}{" "}
                    {unpriced.length === 1 ? "element" : "elemente"}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="[&_th]:!text-white">
                      <TableRow className="border-white/20 hover:bg-transparent">
                        <TableHead>Element</TableHead>
                        <TableHead>Preț</TableHead>
                        <TableHead>U.M.</TableHead>
                        <TableHead>Categorie</TableHead>
                        {canManage ? <TableHead className="text-right">Acțiuni</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unpriced.map((material) => (
                        <TableRow key={material.id} className={attentionRowClass}>
                          <TableCell className="font-medium">{material.name}</TableCell>
                          <TableCell>
                            {canManage ? (
                              <UnpricedPriceField
                                material={material}
                                disabled={pending}
                                onSave={changePrice}
                              />
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {hasUnconfirmedPrice(material)
                                  ? "Preț nesetat"
                                  : formatMaterialPrice(
                                      material.unitPrice,
                                      material.currency,
                                    )}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canManage ? (
                              <select
                                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                                aria-label={`Unitatea pentru ${material.name}`}
                                value={material.unitOfMeasure}
                                disabled={pending}
                                onChange={(event) =>
                                  changeUnit(material, event.target.value)
                                }
                              >
                                {MATERIAL_UNITS.map((unit) => (
                                  <option key={unit} value={unit}>
                                    {unit}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-sm">{material.unitOfMeasure}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {canManage ? (
                              <select
                                className="h-8 max-w-56 rounded-lg border border-input bg-transparent px-2 text-sm"
                                aria-label={`Categoria pentru ${material.name}`}
                                defaultValue=""
                                disabled={pending}
                                onChange={(event) =>
                                  assignCategory(material, event.target.value)
                                }
                              >
                                <option value="">Alege categoria</option>
                                {categories
                                  .filter((category) => category.isActive)
                                  .map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                Fără categorie
                              </span>
                            )}
                          </TableCell>
                          {canManage ? (
                            <TableCell className="text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={pending}
                                onClick={() => setDeleteTarget(material)}
                              >
                                Șterge
                              </Button>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ) : null}
            {grouped.map((group) => (
              <section
                key={group.categoryId}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2 className="truncate text-sm font-semibold tracking-tight text-foreground">
                      {group.categoryName}
                    </h2>
                    {!group.categoryActive ? (
                      <Badge variant="outline">Categorie inactivă</Badge>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {group.materials.length}{" "}
                    {group.materials.length === 1 ? "material" : "materiale"}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nume</TableHead>
                        <TableHead>Preț</TableHead>
                        <TableHead>U.M.</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Acțiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.materials.map((material) => {
                        const unconfirmedPrice = hasUnconfirmedPrice(material);
                        const unconfirmedUom = hasUnconfirmedUom(material);

                        return (
                          <TableRow
                            key={material.id}
                            className={
                              needsAttention(material) ? attentionRowClass : undefined
                            }
                          >
                            <TableCell className="max-w-[280px]">
                              <div className="font-medium text-foreground">
                                {material.name}
                              </div>
                              {(unconfirmedPrice || unconfirmedUom) && (
                                <div className="mt-1.5 flex flex-wrap gap-1.5">
                                  {unconfirmedPrice ? (
                                    <Badge variant="outline">
                                      Preț neconfirmat
                                    </Badge>
                                  ) : null}
                                  {unconfirmedUom ? (
                                    <Badge variant="outline">
                                      U.M. neconfirmată
                                    </Badge>
                                  ) : null}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-sm">
                              {unconfirmedPrice ? (
                                <span className="font-medium">Preț nesetat</span>
                              ) : (
                                formatMaterialPrice(
                                  material.unitPrice,
                                  material.currency,
                                )
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {unconfirmedUom ? (
                                <span className="font-medium">neconfirmat</span>
                              ) : (
                                material.unitOfMeasure
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  material.isActive ? "secondary" : "outline"
                                }
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
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEdit(material)}
                                      disabled={pending}
                                    >
                                      Editează
                                    </Button>
                                    {material.isActive ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          setDeactivateTarget(material)
                                        }
                                        disabled={pending}
                                      >
                                        Dezactivează
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => reactivate(material)}
                                        disabled={pending}
                                      >
                                        Reactivează
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setDeleteTarget(material)}
                                      disabled={pending}
                                    >
                                      Șterge
                                    </Button>
                                  </>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            ))}
          </div>
        )}
      </section>

      <CategoriesDialog
        open={categoriesOpen}
        onOpenChange={setCategoriesOpen}
        categories={categories}
        canManage={canManage}
        onChanged={refresh}
      />

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

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
          }
        }}
        title="Ștergeți elementul?"
        description={
          deleteTarget
            ? `„${deleteTarget.name}” va fi scos din listă și nu va mai fi folosit la preț.`
            : undefined
        }
        confirmLabel="Șterge"
        destructive
        pending={pending}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function UnpricedPriceField({
  material,
  disabled,
  onSave,
}: {
  material: MaterialDTO;
  disabled: boolean;
  onSave: (material: MaterialDTO, rawPrice: string) => void;
}) {
  const [draft, setDraft] = useState(material.unitPrice ?? "");

  useEffect(() => {
    setDraft(material.unitPrice ?? "");
  }, [material.unitPrice]);

  function commit() {
    const next = draft.trim();
    if (!next || next === (material.unitPrice ?? "")) {
      setDraft(material.unitPrice ?? "");
      return;
    }
    onSave(material, next);
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        className="h-8 w-28"
        inputMode="decimal"
        aria-label={`Preț pentru ${material.name}`}
        placeholder="Preț"
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
        }}
      />
      <span className="text-xs text-muted-foreground">MDL</span>
    </div>
  );
}
