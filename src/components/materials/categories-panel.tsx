"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createCategoryAction,
  renameCategoryAction,
  setCategoryActiveAction,
} from "@/modules/materials/actions";
import type { MaterialCategoryDTO } from "@/modules/materials/types";

type CategoriesPanelProps = {
  categories: MaterialCategoryDTO[];
  canManage: boolean;
  onChanged: () => void;
};

export function CategoriesPanel({
  categories,
  canManage,
  onChanged,
}: CategoriesPanelProps) {
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeactivate, setPendingDeactivate] =
    useState<MaterialCategoryDTO | null>(null);
  const [pending, startTransition] = useTransition();

  function createCategory() {
    startTransition(async () => {
      const result = await createCategoryAction({ name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setName("");
      onChanged();
    });
  }

  function saveRename(id: string) {
    startTransition(async () => {
      const result = await renameCategoryAction({ id, name: editingName });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setEditingId(null);
      onChanged();
    });
  }

  function confirmDeactivate() {
    if (!pendingDeactivate) {
      return;
    }
    startTransition(async () => {
      const result = await setCategoryActiveAction(pendingDeactivate.id, false);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setPendingDeactivate(null);
      onChanged();
    });
  }

  function reactivate(id: string) {
    startTransition(async () => {
      const result = await setCategoryActiveAction(id, true);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      onChanged();
    });
  }

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-foreground">Categorii</h2>
          <p className="text-xs text-muted-foreground">
            Materiale, componente și operațiuni. Dezactivarea este soft.
          </p>
        </div>
      </div>

      {canManage ? (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Nume categorie nouă"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={pending}
          />
          <Button
            type="button"
            onClick={createCategory}
            disabled={pending || name.trim().length === 0}
          >
            Adaugă
          </Button>
        </div>
      ) : null}

      <ul className="divide-y divide-border rounded-lg border border-border">
        {categories.map((category) => (
          <li
            key={category.id}
            className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              {editingId === category.id ? (
                <Input
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                  disabled={pending}
                />
              ) : (
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium">
                    {category.name}
                  </span>
                  <Badge variant={category.isActive ? "secondary" : "outline"}>
                    {category.isActive ? "Activă" : "Inactivă"}
                  </Badge>
                </div>
              )}
            </div>

            {canManage ? (
              <div className="flex flex-wrap gap-2">
                {editingId === category.id ? (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => saveRename(category.id)}
                      disabled={pending}
                    >
                      Salvează
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                      disabled={pending}
                    >
                      Anulează
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingId(category.id);
                        setEditingName(category.name);
                      }}
                      disabled={pending}
                    >
                      Redenumește
                    </Button>
                    {category.isActive ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingDeactivate(category)}
                        disabled={pending}
                      >
                        Dezactivează
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => reactivate(category.id)}
                        disabled={pending}
                      >
                        Reactivează
                      </Button>
                    )}
                  </>
                )}
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(pendingDeactivate)}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeactivate(null);
          }
        }}
        title="Dezactivați categoria?"
        description={
          pendingDeactivate
            ? `Categoria „${pendingDeactivate.name}” va fi dezactivată. Materialele existente rămân, dar categoria nu va mai putea fi selectată pentru materiale noi.`
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
