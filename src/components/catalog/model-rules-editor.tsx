"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveConfiguratorRulesAction } from "@/modules/catalog/actions";
import {
  defaultConfiguratorRules,
  FEATURE_LABELS,
  FEATURE_SECTIONS,
  optionCatalogForFeature,
  resolveConfiguratorRules,
  type ConfiguratorFeatureKey,
  type ConfiguratorRulesV1,
  type FeatureMode,
} from "@/modules/catalog/rules";

type Props = {
  modelId: string;
  defaultWidthMm: number;
  defaultHeightMm: number;
  initialRules: unknown | null;
  canManage: boolean;
};

const MODES: Array<{ id: FeatureMode; label: string }> = [
  { id: "FIXED", label: "Fix" },
  { id: "EDITABLE", label: "Editabil" },
  { id: "HIDDEN", label: "Ascuns" },
];

export function ModelRulesEditor({
  modelId,
  defaultWidthMm,
  defaultHeightMm,
  initialRules,
  canManage,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sectionId, setSectionId] = useState(FEATURE_SECTIONS[0]!.id);
  const [rules, setRules] = useState<ConfiguratorRulesV1>(() =>
    resolveConfiguratorRules(initialRules ?? defaultConfiguratorRules()),
  );

  const section = useMemo(
    () => FEATURE_SECTIONS.find((item) => item.id === sectionId) ?? FEATURE_SECTIONS[0]!,
    [sectionId],
  );

  function setFeatureMode(feature: ConfiguratorFeatureKey, mode: FeatureMode) {
    setRules((current) => ({
      ...current,
      features: {
        ...current.features,
        [feature]: {
          ...current.features[feature],
          mode,
          allowedValues:
            mode === "EDITABLE"
              ? current.features[feature].allowedValues ?? []
              : [],
        },
      },
      dimensions: {
        ...current.dimensions,
        ...(feature === "width"
          ? { width: { ...current.dimensions.width, mode } }
          : {}),
        ...(feature === "height"
          ? { height: { ...current.dimensions.height, mode } }
          : {}),
      },
    }));
  }

  function toggleAllowed(feature: ConfiguratorFeatureKey, value: string) {
    setRules((current) => {
      const existing = new Set(current.features[feature].allowedValues ?? []);
      if (existing.has(value)) {
        existing.delete(value);
      } else {
        existing.add(value);
      }
      return {
        ...current,
        features: {
          ...current.features,
          [feature]: {
            ...current.features[feature],
            allowedValues: [...existing],
          },
        },
      };
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveConfiguratorRulesAction({
        modelId,
        rules,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Din configurația tehnică se ia baza produsului (formă, LED, sticlă). Aici
        alegi ce vede clientul pe site.{" "}
        <span className="font-medium text-foreground">Fix</span> se afișează și nu
        se poate schimba. <span className="font-medium text-foreground">Editabil</span>{" "}
        devine opțiune de personalizare, iar prețul se recalculează automat.{" "}
        <span className="font-medium text-foreground">Ascuns</span> nu apare.
        Implicit totul este fix. Modificările nu alterează ofertele emise.
        Dimensiuni implicite model: {defaultWidthMm} × {defaultHeightMm} mm.
      </div>

      {!canManage ? (
        <p className="text-sm text-muted-foreground">
          Doar ADMIN poate modifica regulile comerciale. Puteți consulta setările
          de mai jos.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {FEATURE_SECTIONS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={sectionId === item.id ? "default" : "ghost"}
            onClick={() => setSectionId(item.id)}
          >
            {item.title}
          </Button>
        ))}
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold">{section.title}</h3>

        {section.id === "dimensions" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {(["width", "height"] as const).map((axis) => {
              const rule = rules.dimensions[axis];
              return (
                <div
                  key={axis}
                  className="space-y-3 rounded-lg border border-border/70 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {axis === "width" ? "Lățime" : "Înălțime"}
                    </p>
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={rule.mode}
                      disabled={!canManage}
                      onChange={(event) =>
                        setFeatureMode(axis, event.target.value as FeatureMode)
                      }
                    >
                      {MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Min mm</Label>
                      <Input
                        disabled={!canManage || rule.mode === "HIDDEN"}
                        value={rule.minMm ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setRules((current) => ({
                            ...current,
                            dimensions: {
                              ...current.dimensions,
                              [axis]: {
                                ...current.dimensions[axis],
                                minMm: value === "" ? null : Number(value),
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Max mm</Label>
                      <Input
                        disabled={!canManage || rule.mode === "HIDDEN"}
                        value={rule.maxMm ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setRules((current) => ({
                            ...current,
                            dimensions: {
                              ...current.dimensions,
                              [axis]: {
                                ...current.dimensions[axis],
                                maxMm: value === "" ? null : Number(value),
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Pas mm</Label>
                      <Input
                        disabled={!canManage || rule.mode !== "EDITABLE"}
                        value={rule.stepMm ?? ""}
                        onChange={(event) => {
                          const value = event.target.value;
                          setRules((current) => ({
                            ...current,
                            dimensions: {
                              ...current.dimensions,
                              [axis]: {
                                ...current.dimensions[axis],
                                stepMm: value === "" ? null : Number(value),
                              },
                            },
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="space-y-3">
          {section.features
            .filter((feature) => feature !== "width" && feature !== "height")
            .map((feature) => {
              const rule = rules.features[feature];
              const options = optionCatalogForFeature(feature);
              return (
                <div
                  key={feature}
                  className="space-y-2 rounded-lg border border-border/70 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {FEATURE_LABELS[feature]}
                    </p>
                    <select
                      className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
                      value={rule.mode}
                      disabled={!canManage}
                      onChange={(event) =>
                        setFeatureMode(
                          feature,
                          event.target.value as FeatureMode,
                        )
                      }
                    >
                      {MODES.map((mode) => (
                        <option key={mode.id} value={mode.id}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {rule.mode === "EDITABLE" && options.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {options.map((option) => {
                        const checked = (rule.allowedValues ?? []).includes(
                          option.id,
                        );
                        return (
                          <label
                            key={option.id}
                            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs"
                          >
                            <input
                              type="checkbox"
                              disabled={!canManage}
                              checked={checked}
                              onChange={() => toggleAllowed(feature, option.id)}
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                  {rule.mode === "HIDDEN" ? (
                    <p className="text-xs text-muted-foreground">
                      Clientul nu vede opțiunea. Valoarea implicită a modelului
                      rămâne activă pe server dacă este necesară tehnic.
                    </p>
                  ) : null}
                  {rule.mode === "FIXED" ? (
                    <p className="text-xs text-muted-foreground">
                      Clientul nu poate schimba — se folosește valoarea din
                      configurația tehnică a modelului.
                    </p>
                  ) : null}
                </div>
              );
            })}
        </div>
      </section>

      {canManage ? (
        <Button type="button" disabled={pending} onClick={save}>
          Salvează regulile
        </Button>
      ) : null}
    </div>
  );
}
