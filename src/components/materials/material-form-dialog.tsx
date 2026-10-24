"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MATERIAL_CURRENCY } from "@/modules/materials/constants";
import {
  createMaterialAction,
  updateMaterialAction,
} from "@/modules/materials/actions";
import type {
  MaterialCategoryDTO,
  MaterialDTO,
} from "@/modules/materials/types";

type MaterialFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MaterialCategoryDTO[];
  material?: MaterialDTO | null;
  onSaved: () => void;
};

type FormState = {
  name: string;
  internalCode: string;
  categoryId: string;
  unitPrice: string;
  unitOfMeasure: string;
  description: string;
  isActive: boolean;
};

function toFormState(material?: MaterialDTO | null, fallbackCategoryId = ""): FormState {
  return {
    name: material?.name ?? "",
    internalCode: material?.internalCode ?? "",
    categoryId: material?.categoryId ?? fallbackCategoryId,
    unitPrice: material?.unitPrice ?? "",
    unitOfMeasure: material?.unitOfMeasure ?? "",
    description: material?.description ?? "",
    isActive: material?.isActive ?? true,
  };
}

function MaterialFormFields({
  categories,
  material,
  onOpenChange,
  onSaved,
}: {
  categories: MaterialCategoryDTO[];
  material?: MaterialDTO | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const activeCategories = categories.filter((category) => category.isActive);
  const categoryOptions =
    material && !activeCategories.some((c) => c.id === material.categoryId)
      ? ([
          ...activeCategories,
          categories.find((c) => c.id === material.categoryId),
        ].filter(Boolean) as MaterialCategoryDTO[])
      : activeCategories;

  const [form, setForm] = useState<FormState>(() =>
    toFormState(material, activeCategories[0]?.id ?? ""),
  );
  const [pending, startTransition] = useTransition();

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    startTransition(async () => {
      const payload = {
        ...(material ? { id: material.id } : {}),
        name: form.name,
        internalCode: form.internalCode,
        categoryId: form.categoryId,
        unitPrice: form.unitPrice.trim() === "" ? null : form.unitPrice.trim(),
        unitOfMeasure: form.unitOfMeasure,
        currency: MATERIAL_CURRENCY,
        description: form.description,
        isActive: form.isActive,
      };

      const result = material
        ? await updateMaterialAction(payload)
        : await createMaterialAction(payload);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(result.message);
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="material-name">Nume</Label>
        <Input
          id="material-name"
          value={form.name}
          onChange={(event) => updateField("name", event.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="material-code">Cod intern (opțional)</Label>
        <Input
          id="material-code"
          value={form.internalCode}
          onChange={(event) => updateField("internalCode", event.target.value)}
          disabled={pending}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="material-category">Categorie</Label>
        <select
          id="material-category"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          value={form.categoryId}
          onChange={(event) => updateField("categoryId", event.target.value)}
          required
          disabled={pending}
        >
          <option value="" disabled>
            Selectați categoria
          </option>
          {categoryOptions.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
              {!category.isActive ? " (inactivă)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="material-price">
            Preț unitar ({MATERIAL_CURRENCY})
          </Label>
          <Input
            id="material-price"
            inputMode="decimal"
            placeholder="gol = nesetat"
            value={form.unitPrice}
            onChange={(event) => updateField("unitPrice", event.target.value)}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="material-uom">Unitate de măsură</Label>
          <Input
            id="material-uom"
            value={form.unitOfMeasure}
            onChange={(event) =>
              updateField("unitOfMeasure", event.target.value)
            }
            placeholder="ex. m², metru, bucată"
            required
            disabled={pending}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="material-description">Descriere (opțional)</Label>
        <Textarea
          id="material-description"
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          disabled={pending}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="size-4 rounded border-input"
          checked={form.isActive}
          onChange={(event) => updateField("isActive", event.target.checked)}
          disabled={pending}
        />
        Activ
      </label>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={pending}
        >
          Anulează
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function MaterialFormDialog({
  open,
  onOpenChange,
  categories,
  material,
  onSaved,
}: MaterialFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton>
        <DialogHeader>
          <DialogTitle>
            {material ? "Editează material" : "Adaugă material"}
          </DialogTitle>
          <DialogDescription>
            Prețurile sunt în {MATERIAL_CURRENCY}. Lăsați prețul gol dacă nu este
            setat — nu se tratează ca 0.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <MaterialFormFields
            key={material?.id ?? "new"}
            categories={categories}
            material={material}
            onOpenChange={onOpenChange}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
