"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { runPricingCalculatorAction } from "@/modules/pricing/actions";
import type { CalculationResult } from "@/modules/pricing/engine";
import { roundMoney } from "@/modules/pricing/engine";

function money(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${roundMoney(value).toFixed(2)} MDL`;
}

export function PricingCalculator() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [form, setForm] = useState({
    widthMm: "600",
    heightMm: "1000",
    shape: "RECTANGLE" as "RECTANGLE" | "SPECIAL",
    curvedLeft: false,
    curvedRight: false,
    curvedTop: false,
    curvedBottom: false,
    ledMeters: "0",
    transformerPcs: "0",
    touchPcs: "0",
    decorativeSandblastAreaM2: "0",
    laborCost: "",
    serviceCosts: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const response = await runPricingCalculatorAction(form);
      if (!response.ok || !response.data) {
        toast.error(response.message);
        setResult(null);
        return;
      }
      setResult(response.data);
      if (response.data.status === "COMPLETE") {
        toast.success(response.message);
      } else {
        toast.message(response.message);
      }
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Tester formule
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rulează motorul de calcul pe dimensiuni și cantități explicite. Nu
          înlocuiește configuratorul.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="width">Lățime (mm)</Label>
            <Input
              id="width"
              value={form.widthMm}
              onChange={(event) => update("widthMm", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="height">Înălțime (mm)</Label>
            <Input
              id="height"
              value={form.heightMm}
              onChange={(event) => update("heightMm", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="shape">Formă</Label>
            <select
              id="shape"
              className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={form.shape}
              onChange={(event) =>
                update("shape", event.target.value as "RECTANGLE" | "SPECIAL")
              }
              disabled={pending}
            >
              <option value="RECTANGLE">Dreptunghi / pătrat</option>
              <option value="SPECIAL">Formă specială</option>
            </select>
          </div>
        </div>

        {form.shape === "SPECIAL" ? (
          <fieldset className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4">
            <legend className="px-1 text-xs text-muted-foreground">
              Laturi curbe (adaos standard)
            </legend>
            {(
              [
                ["curvedLeft", "Stânga"],
                ["curvedRight", "Dreapta"],
                ["curvedTop", "Sus"],
                ["curvedBottom", "Jos"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(event) => update(key, event.target.checked)}
                  disabled={pending}
                />
                {label}
              </label>
            ))}
          </fieldset>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="led">LED (m)</Label>
            <Input
              id="led"
              value={form.ledMeters}
              onChange={(event) => update("ledMeters", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transformer">Transformatoare (buc)</Label>
            <Input
              id="transformer"
              value={form.transformerPcs}
              onChange={(event) => update("transformerPcs", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="touch">Touch (buc)</Label>
            <Input
              id="touch"
              value={form.touchPcs}
              onChange={(event) => update("touchPcs", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sandblast">Sablare decorativă (m²)</Label>
            <Input
              id="sandblast"
              value={form.decorativeSandblastAreaM2}
              onChange={(event) =>
                update("decorativeSandblastAreaM2", event.target.value)
              }
              disabled={pending}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="labor">Manoperă (MDL, opțional)</Label>
            <Input
              id="labor"
              value={form.laborCost}
              placeholder="gol = neconfigurat"
              onChange={(event) => update("laborCost", event.target.value)}
              disabled={pending}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="services">Servicii comerciale (MDL, opțional)</Label>
            <Input
              id="services"
              value={form.serviceCosts}
              placeholder="fără adaos automat"
              onChange={(event) => update("serviceCosts", event.target.value)}
              disabled={pending}
            />
          </div>
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Se calculează…" : "Calculează"}
        </Button>
      </form>

      {result ? (
        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={result.status === "COMPLETE" ? "secondary" : "outline"}>
              {result.status === "COMPLETE" ? "COMPLETE" : "INCOMPLETE"}
            </Badge>
            {result.meta.glassAreaM2 !== null ? (
              <span className="text-xs text-muted-foreground">
                Arie sticlă {result.meta.glassAreaM2.toFixed(4)} m²
                {result.meta.calcWidthMm && result.meta.calcHeightMm
                  ? ` (${result.meta.calcWidthMm}×${result.meta.calcHeightMm} mm)`
                  : ""}
              </span>
            ) : null}
          </div>

          {result.missingCosts.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
              <p className="font-medium">Costuri lipsă</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-muted-foreground">
                {result.missingCosts.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Cost sticlă" value={money(result.glassCost)} />
            <SummaryCard
              label="Cost componente"
              value={money(result.componentCosts)}
            />
            <SummaryCard
              label="Cost operațiuni"
              value={money(result.operationCosts)}
            />
            <SummaryCard label="Manoperă" value={money(result.laborCost)} />
            <SummaryCard
              label="Cost producție"
              value={money(result.totalProductionCost)}
            />
            <SummaryCard
              label="En-gros"
              value={money(result.wholesalePrice)}
            />
            <SummaryCard label="Retail" value={money(result.retailPrice)} />
            <SummaryCard
              label="Servicii (fără adaos)"
              value={money(result.serviceCosts)}
            />
          </div>

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linie</TableHead>
                  <TableHead>Cant.</TableHead>
                  <TableHead>Preț unitar</TableHead>
                  <TableHead>Sumă</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.lines.map((line) => (
                  <TableRow key={`${line.kind}-${line.key}`}>
                    <TableCell className="text-sm">
                      <div className="font-medium">{line.label}</div>
                      {line.note ? (
                        <div className="text-xs text-muted-foreground">
                          {line.note}
                        </div>
                      ) : null}
                      {line.incompleteReason ? (
                        <div className="text-xs text-destructive">
                          {line.incompleteReason}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {line.quantity === null
                        ? "—"
                        : `${line.quantity}${line.unit ? ` ${line.unit}` : ""}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {money(line.unitPrice)}
                    </TableCell>
                    <TableCell className="text-sm">{money(line.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
