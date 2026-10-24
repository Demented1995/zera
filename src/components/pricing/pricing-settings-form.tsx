"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePricingSettingsAction } from "@/modules/pricing/actions";
import type { PricingSettingsDTO } from "@/modules/pricing/serialize";

type PricingSettingsFormProps = {
  settings: PricingSettingsDTO;
  canEdit: boolean;
};

export function PricingSettingsForm({
  settings,
  canEdit,
}: PricingSettingsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    wholesaleMarkupPercent: settings.wholesaleMarkupPercent,
    retailMarkupPercent: settings.retailMarkupPercent,
    curvedEdgeAddMm: settings.curvedEdgeAddMm,
    sandblastMinCharge: settings.sandblastMinCharge,
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canEdit) {
      return;
    }

    startTransition(async () => {
      const result = await updatePricingSettingsAction(form);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-xl border border-border bg-card p-5"
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Reguli globale
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Se aplică tuturor oglinzilor. Prețurile materialelor se editează în
          Materiale și componente.
          {!canEdit
            ? " Aveți acces doar la vizualizare."
            : null}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="wholesale">Adaos en-gros (%)</Label>
          <Input
            id="wholesale"
            inputMode="decimal"
            value={form.wholesaleMarkupPercent}
            disabled={!canEdit || pending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                wholesaleMarkupPercent: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="retail">Adaos retail (%)</Label>
          <Input
            id="retail"
            inputMode="decimal"
            value={form.retailMarkupPercent}
            disabled={!canEdit || pending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                retailMarkupPercent: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="curve">Adaos latură curbă (mm)</Label>
          <Input
            id="curve"
            inputMode="decimal"
            value={form.curvedEdgeAddMm}
            disabled={!canEdit || pending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                curvedEdgeAddMm: event.target.value,
              }))
            }
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="sandblast-min">Minim sablare (MDL)</Label>
          <Input
            id="sandblast-min"
            inputMode="decimal"
            value={form.sandblastMinCharge}
            disabled={!canEdit || pending}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                sandblastMinCharge: event.target.value,
              }))
            }
          />
        </div>
      </div>

      {canEdit ? (
        <Button type="submit" disabled={pending}>
          {pending ? "Se salvează…" : "Salvează regulile"}
        </Button>
      ) : null}
    </form>
  );
}
