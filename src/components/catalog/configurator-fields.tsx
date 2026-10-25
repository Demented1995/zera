"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatSupplementMdl } from "@/modules/catalog/preview/supplement-label";
import type {
  PreviewControl,
  PreviewPatch,
  PreviewSection,
} from "@/modules/catalog/preview/types";

type Props = {
  sections: PreviewSection[];
  controls: PreviewControl[];
  revision: number;
  onPatch: (patch: PreviewPatch) => void;
};

export function ConfiguratorFields({ sections, controls, onPatch }: Props) {
  const dimensionControls = controls.filter(
    (control): control is Extract<PreviewControl, { kind: "dimension" }> =>
      control.kind === "dimension",
  );
  const dimensions = [
    dimensionControls.find((control) => control.field === "heightMm"),
    dimensionControls.find((control) => control.field === "widthMm"),
  ].filter((control) => control != null);
  const fixed = controls.filter(
    (control) =>
      control.kind === "text" &&
      control.id !== "shape" &&
      !(control.id === "sandblast" && control.valueLabel === "Sablare standard"),
  );
  const editable = controls.filter(
    (control) => control.kind !== "text" && control.kind !== "dimension",
  );
  const editableSections = sections.filter((section) =>
    editable.some((control) => control.section === section.id),
  );

  if (controls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {dimensions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {dimensions.map((control) => (
            <ControlField
              key={control.id}
              control={control}
              onPatch={onPatch}
            />
          ))}
        </div>
      ) : null}

      {fixed.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Configurație
          </h3>
          <dl className="divide-y divide-border border-y border-border">
            {fixed.map((control) => (
              <ControlField key={control.id} control={control} onPatch={onPatch} />
            ))}
          </dl>
        </section>
      ) : null}

      {editable.length > 0 ? (
        <div className="space-y-6">
          <h3 className="text-xs tracking-[0.16em] text-muted-foreground uppercase">
            Opțiuni suplimentare
          </h3>
          {editableSections.map((section) => (
            <OptionSection
              key={section.id}
              section={section}
              controls={editable.filter((control) => control.section === section.id)}
              onPatch={onPatch}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function OptionSection({
  section,
  controls,
  onPatch,
}: {
  section: PreviewSection;
  controls: PreviewControl[];
  onPatch: (patch: PreviewPatch) => void;
}) {
  const showTitle = section.id !== "glass";
  return (
    <section className="space-y-3">
      {showTitle ? (
        <h4 className="text-xs font-medium tracking-[0.14em] text-foreground uppercase">
          {section.title}
        </h4>
      ) : null}
      <div className="space-y-4">
        {controls.map((control) => (
          <ControlField key={control.id} control={control} onPatch={onPatch} />
        ))}
      </div>
    </section>
  );
}

function patchSelect(
  control: Extract<PreviewControl, { kind: "select" }>,
  raw: string,
  onPatch: (patch: PreviewPatch) => void,
) {
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
}

function ChoiceGroup({
  label,
  value,
  options,
  onPick,
}: {
  label: string;
  value: string;
  options: Array<{ id: string; label: string; supplementMdl?: number | null }>;
  onPick: (id: string) => void;
}) {
  return (
    <fieldset className="space-y-2">
      {label ? <legend className="text-sm font-medium">{label}</legend> : null}
      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nicio variantă permisă.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onPick(option.id)}
                className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 py-2 text-sm ${
                  selected
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-transparent text-foreground"
                }`}
              >
                <span>{option.label}</span>
                {option.supplementMdl != null ? (
                  <span className={selected ? "text-background/80" : "text-muted-foreground"}>
                    {formatSupplementMdl(option.supplementMdl)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </fieldset>
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
      <div className="flex items-baseline justify-between gap-4 py-2.5">
        <dt className="text-sm text-muted-foreground">{control.label}</dt>
        <dd className="text-right text-sm font-medium">{control.valueLabel}</dd>
      </div>
    );
  }

  if (control.kind === "dimension") {
    return <DimensionField control={control} onPatch={onPatch} />;
  }

  if (control.kind === "toggle") {
    return (
      <ChoiceGroup
        label={control.label}
        value={control.value ? "true" : "false"}
        options={[
          {
            id: "false",
            label: "Nu",
            supplementMdl: control.supplementMdl == null ? null : 0,
          },
          { id: "true", label: "Da", supplementMdl: control.supplementMdl ?? null },
        ]}
        onPick={(id) =>
          onPatch({
            field: control.field,
            value: id === "true",
          })
        }
      />
    );
  }

  if (control.kind === "select") {
    const useMenu = control.options.length > 4;
    const label = control.id === "glassType" ? "" : control.label;
    if (useMenu) {
      return (
        <div className="grid gap-1.5">
          {label ? <Label htmlFor={control.id}>{label}</Label> : null}
          {control.options.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nicio variantă permisă.</p>
          ) : (
            <select
              id={control.id}
              className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
              value={control.value}
              onChange={(event) => patchSelect(control, event.target.value, onPatch)}
            >
              {control.options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.supplementMdl != null
                    ? ` (${formatSupplementMdl(option.supplementMdl)})`
                    : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      );
    }
    return (
      <ChoiceGroup
        label={label}
        value={control.value}
        options={control.options}
        onPick={(id) => patchSelect(control, id, onPatch)}
      />
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
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setDraft(String(control.value));
    }
  }, [control.value]);

  if (control.mode === "FIXED") {
    return (
      <div className="grid gap-1.5">
        <Label htmlFor={control.id}>{control.label}, mm</Label>
        <div
          id={control.id}
          className="flex h-10 items-center rounded-lg border border-input px-3 text-sm"
        >
          {control.value}
        </div>
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
    if (!Number.isFinite(next) || next <= 0 || next === control.value) {
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
      <Label htmlFor={control.id}>{control.label}, mm</Label>
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
          onFocus={() => {
            focusedRef.current = true;
          }}
          onBlur={() => {
            focusedRef.current = false;
            commit(Number(draft.replace(",", ".")));
          }}
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
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
