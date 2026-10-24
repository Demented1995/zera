"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  CustomerPreviewPayload,
  PreviewControl,
  PreviewPatch,
} from "@/modules/catalog/preview/types";

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm";

type Props = {
  customer: CustomerPreviewPayload;
  pending: boolean;
  revision: number;
  onPatch: (patch: PreviewPatch) => void;
};

export function CustomerConfigurator({
  customer,
  pending,
  revision,
  onPatch,
}: Props) {
  const controlsBySection = new Map<string, PreviewControl[]>();
  for (const control of customer.controls) {
    const list = controlsBySection.get(control.section) ?? [];
    list.push(control);
    controlsBySection.set(control.section, list);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <ModelPlaceholder />
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
            {customer.model.code}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {customer.model.name}
          </h2>
          {customer.model.shortDescription ? (
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {customer.model.shortDescription}
            </p>
          ) : null}
          {customer.model.fullDescription ? (
            <p className="max-w-xl text-sm leading-6">{customer.model.fullDescription}</p>
          ) : null}
        </header>

        <PriceSummary customer={customer} pending={pending} />

        <div className="space-y-8">
          {customer.sections.map((section) => (
            <section key={section.id} className="space-y-4">
              <h3 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                {section.title}
              </h3>
              <div className="space-y-4">
                {(controlsBySection.get(section.id) ?? []).map((control) => (
                  <ControlField
                    key={
                      control.kind === "dimension"
                        ? `${control.id}-${control.value}-${revision}`
                        : control.id
                    }
                    control={control}
                    onPatch={onPatch}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function ModelPlaceholder() {
  return (
    <div className="lg:sticky lg:top-6">
      <div className="flex aspect-[5/4] max-h-80 items-center justify-center rounded-2xl border border-border bg-muted/40 lg:aspect-[4/5] lg:max-h-none">
        <div className="flex w-40 flex-col items-center gap-4 text-center">
          <div className="h-28 w-20 rounded-full border border-foreground/15 bg-background shadow-sm" />
          <div>
            <p className="text-xs tracking-[0.28em] text-muted-foreground">ZERA</p>
            <p className="mt-1 text-sm text-muted-foreground">Fără fotografie</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceSummary({
  customer,
  pending,
}: {
  customer: CustomerPreviewPayload;
  pending: boolean;
}) {
  const formatted =
    customer.price.available && customer.price.retailPrice != null
      ? `${new Intl.NumberFormat("ro-RO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(customer.price.retailPrice)} MDL`
      : null;

  return (
    <div
      className="rounded-2xl border border-border bg-card px-5 py-4"
      aria-live="polite"
      aria-busy={pending}
    >
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Preț retail
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {formatted ?? customer.price.message}
      </p>
      {pending ? (
        <p className="mt-2 text-sm text-muted-foreground">Se recalculează prețul…</p>
      ) : null}
      {customer.notices.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-destructive">
          {customer.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ControlField({
  control,
  onPatch,
}: {
  control: PreviewControl;
  onPatch: (patch: PreviewPatch) => void;
}) {
  if (control.kind === "text") {
    return (
      <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2">
        <span className="text-sm text-muted-foreground">{control.label}</span>
        <span className="text-right text-sm font-medium">{control.valueLabel}</span>
      </div>
    );
  }

  if (control.kind === "dimension") {
    return (
      <DimensionField control={control} onPatch={onPatch} />
    );
  }

  if (control.kind === "toggle") {
    return (
      <label className="flex items-center justify-between gap-4 py-1">
        <span className="text-sm">{control.label}</span>
        <input
          type="checkbox"
          className="size-4 accent-foreground"
          checked={control.value}
          onChange={(event) =>
            onPatch({ field: control.field, value: event.target.checked })
          }
        />
      </label>
    );
  }

  if (control.kind === "select") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={control.id}>{control.label}</Label>
        {control.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio variantă permisă.</p>
        ) : (
          <select
            id={control.id}
            className={selectClass}
            value={control.value}
            onChange={(event) => {
              const raw = event.target.value;
              if (control.numeric) {
                onPatch({
                  field: control.field as "frontLightTempK",
                  value: Number(raw),
                });
                return;
              }
              onPatch({
                field: control.field as "shapeId",
                value: raw,
              });
            }}
          >
            <option value="" disabled>
              Alegeți
            </option>
            {control.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        )}
      </div>
    );
  }

  if (control.kind === "checks") {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{control.label}</legend>
        {control.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio variantă permisă.</p>
        ) : (
          control.options.map((option) => {
            const checked = control.values.includes(option.id);
            return (
              <label key={option.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-foreground"
                  checked={checked}
                  onChange={(event) => {
                    const values = event.target.checked
                      ? [...control.values, option.id]
                      : control.values.filter((id) => id !== option.id);
                    onPatch({ field: control.field, value: values });
                  }}
                />
                {option.label}
              </label>
            );
          })
        )}
      </fieldset>
    );
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{control.label}</legend>
      {control.lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nicio variantă permisă.</p>
      ) : (
        control.lines.map((line) => (
          <label key={line.type} className="flex items-center justify-between gap-3 text-sm">
            <span>{line.label}</span>
            <Input
              type="number"
              min={0}
              step={1}
              className="h-9 w-24"
              value={line.qty}
              onChange={(event) => {
                const qty = Number(event.target.value);
                const lines = control.lines.map((item) =>
                  item.type === line.type
                    ? { type: item.type, qty: Number.isFinite(qty) ? qty : 0 }
                    : { type: item.type, qty: item.qty },
                );
                onPatch({ field: "cutouts", value: lines.filter((item) => item.qty > 0) });
              }}
            />
          </label>
        ))
      )}
    </fieldset>
  );
}

function DimensionField({
  control,
  onPatch,
}: {
  control: Extract<PreviewControl, { kind: "dimension" }>;
  onPatch: (patch: PreviewPatch) => void;
}) {
  const [draft, setDraft] = useState(String(control.value));

  if (control.mode === "FIXED") {
    return (
      <div className="flex items-baseline justify-between gap-4 border-b border-border/70 py-2">
        <span className="text-sm text-muted-foreground">{control.label}</span>
        <span className="text-sm font-medium">{control.value} mm</span>
      </div>
    );
  }

  const hint = [
    control.minMm != null ? `min ${control.minMm} mm` : null,
    control.maxMm != null ? `max ${control.maxMm} mm` : null,
    control.stepMm != null ? `pas ${control.stepMm} mm` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function commit(next: number) {
    if (!Number.isFinite(next) || next <= 0) {
      setDraft(String(control.value));
      return;
    }
    setDraft(String(next));
    onPatch({ field: control.field, value: next });
  }

  function stepBy(direction: 1 | -1) {
    const step = control.stepMm && control.stepMm > 0 ? control.stepMm : 1;
    commit(Number(control.value) + direction * step);
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={control.id}>{control.label}</Label>
      <div className="flex items-center gap-2">
        {control.stepMm != null ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => stepBy(-1)}
            aria-label={`Scade ${control.label}`}
          >
            −
          </Button>
        ) : null}
        <Input
          id={control.id}
          inputMode="decimal"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => commit(Number(draft.replace(",", ".")))}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commit(Number(draft.replace(",", ".")));
            }
          }}
        />
        {control.stepMm != null ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => stepBy(1)}
            aria-label={`Crește ${control.label}`}
          >
            +
          </Button>
        ) : null}
        <span className="text-sm text-muted-foreground">mm</span>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
