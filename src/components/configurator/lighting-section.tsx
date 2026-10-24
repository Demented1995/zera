"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ELECTRICAL_CONNECTIONS,
  EXTRA_COMPONENTS,
  LED_POSITIONINGS,
  LED_STRIP_TYPES,
  LED_TEMPERATURES,
  LIGHTING_TYPES,
  SWITCH_TYPES,
  lightingUsesBack,
  lightingUsesFront,
  type ExtraComponentConfig,
  type LedSystemConfig,
  type LightingConfig,
  type LightingType,
  type SwitchConfig,
} from "@/modules/configurator/lighting";
import {
  resolveLedLength,
  type LedPositioning,
} from "@/modules/pricing/engine/led-length";
import { roundMoney } from "@/modules/pricing/engine";

type LightingSectionProps = {
  lighting: LightingConfig;
  widthMm: number | null;
  heightMm: number | null;
  shapeIsRectangular: boolean;
  canOverrideLedLength: boolean;
  onChange: (next: LightingConfig) => void;
};

function selectClassName() {
  return "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";
}

export function LightingSection({
  lighting,
  widthMm,
  heightMm,
  shapeIsRectangular,
  canOverrideLedLength,
  onChange,
}: LightingSectionProps) {
  function setLightingType(lightingType: LightingType) {
    onChange({ ...lighting, lightingType });
  }

  function patchFront(patch: Partial<LedSystemConfig>) {
    onChange({ ...lighting, front: { ...lighting.front, ...patch } });
  }

  function patchBack(patch: Partial<LedSystemConfig>) {
    onChange({ ...lighting, back: { ...lighting.back, ...patch } });
  }

  function updateSwitch(index: number, patch: Partial<SwitchConfig>) {
    const switches = lighting.switches.map((item, i) =>
      i === index ? { ...item, ...patch } : item,
    );
    onChange({ ...lighting, switches });
  }

  function addSwitch() {
    onChange({
      ...lighting,
      switches: [
        ...lighting.switches,
        { type: "touch", qty: 1, associatedSystem: "shared" },
      ],
    });
  }

  function removeSwitch(index: number) {
    onChange({
      ...lighting,
      switches: lighting.switches.filter((_, i) => i !== index),
    });
  }

  function updateExtra(id: ExtraComponentConfig["id"], patch: Partial<ExtraComponentConfig>) {
    onChange({
      ...lighting,
      extraComponents: lighting.extraComponents.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    });
  }

  const showFront = lightingUsesFront(lighting.lightingType);
  const showBack = lightingUsesBack(lighting.lightingType);
  const showElectrical = lighting.lightingType !== "none";

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Iluminare LED</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tip iluminare, sisteme față/spate independente, comenzi și alimentare.
          Lungimea LED se recalculează automat (cu supliment 10%).
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="lightingType">Tip iluminare</Label>
        <select
          id="lightingType"
          className={selectClassName()}
          value={lighting.lightingType}
          onChange={(event) =>
            setLightingType(event.target.value as LightingType)
          }
        >
          {LIGHTING_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {showFront ? (
        <LedSystemFields
          title="LED față"
          system={lighting.front}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          canOverrideLedLength={canOverrideLedLength}
          onChange={patchFront}
        />
      ) : null}

      {showBack ? (
        <LedSystemFields
          title="LED spate"
          system={lighting.back}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          canOverrideLedLength={canOverrideLedLength}
          onChange={patchBack}
        />
      ) : null}

      {showElectrical ? (
        <>
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-foreground">
              Comenzi / întrerupătoare
            </legend>
            <p className="text-xs text-muted-foreground">
              Nu se presupune automat câte senzori pentru față+spate. Touch
              include sablarea simbolului.
            </p>
            {lighting.switches.map((sw, index) => (
              <div
                key={`sw-${index}`}
                className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-4"
              >
                <div className="grid gap-1.5">
                  <Label>Tip</Label>
                  <select
                    className={selectClassName()}
                    value={sw.type}
                    onChange={(event) =>
                      updateSwitch(index, {
                        type: event.target.value as SwitchConfig["type"],
                      })
                    }
                  >
                    {SWITCH_TYPES.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                        {!item.materialSeedKey ? " — preț neconfigurat" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Cantitate</Label>
                  <Input
                    inputMode="numeric"
                    value={String(sw.qty)}
                    onChange={(event) =>
                      updateSwitch(index, {
                        qty: Number(event.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Asociere</Label>
                  <select
                    className={selectClassName()}
                    value={sw.associatedSystem}
                    onChange={(event) =>
                      updateSwitch(index, {
                        associatedSystem: event.target
                          .value as SwitchConfig["associatedSystem"],
                      })
                    }
                  >
                    <option value="shared">Comun</option>
                    <option value="front">Față</option>
                    <option value="back">Spate</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    className="h-9 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-muted/40"
                    onClick={() => removeSwitch(index)}
                  >
                    Elimină
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              className="h-9 rounded-lg border border-border px-3 text-sm hover:bg-muted/40"
              onClick={addSwitch}
            >
              Adaugă întrerupător
            </button>
          </fieldset>

          <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
            <legend className="px-1 text-xs font-medium text-foreground">
              Alimentare
            </legend>
            <div className="grid gap-1.5">
              <Label htmlFor="transformerPcs">Transformatoare (buc.)</Label>
              <Input
                id="transformerPcs"
                inputMode="numeric"
                value={String(lighting.transformerPcs)}
                onChange={(event) =>
                  onChange({
                    ...lighting,
                    transformerPcs: Math.max(
                      0,
                      Math.floor(Number(event.target.value) || 0),
                    ),
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Număr explicit — nu se deduce din putere/dimensiune.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="electricalConnection">Conexiune electrică</Label>
              <select
                id="electricalConnection"
                className={selectClassName()}
                value={lighting.electricalConnection}
                onChange={(event) =>
                  onChange({
                    ...lighting,
                    electricalConnection: event.target
                      .value as LightingConfig["electricalConnection"],
                  })
                }
              >
                {ELECTRICAL_CONNECTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Selecție salvată; cost suplimentar doar prin catalog asociat.
              </p>
            </div>
          </fieldset>

          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-foreground">
              Componente tehnice suplimentare
            </legend>
            <p className="text-xs text-muted-foreground">
              Nu se adaugă automat componente obligatorii până la reguli
              admin. Fără material/preț asociat → INCOMPLETE.
            </p>
            <div className="grid gap-2">
              {lighting.extraComponents.map((extra) => {
                const meta = EXTRA_COMPONENTS.find((item) => item.id === extra.id)!;
                return (
                  <div
                    key={extra.id}
                    className="grid gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-[auto_1fr_90px_120px]"
                  >
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={extra.enabled}
                        onChange={(event) =>
                          updateExtra(extra.id, {
                            enabled: event.target.checked,
                            qty: event.target.checked
                              ? Math.max(extra.qty, 1)
                              : extra.qty,
                          })
                        }
                      />
                      <span>{meta.label}</span>
                    </label>
                    <p className="self-center text-xs text-muted-foreground">
                      {meta.materialSeedKey
                        ? "Material asociat"
                        : "Preț neconfigurat"}
                    </p>
                    <Input
                      inputMode="decimal"
                      disabled={!extra.enabled}
                      value={String(extra.qty)}
                      onChange={(event) =>
                        updateExtra(extra.id, {
                          qty: Number(event.target.value) || 0,
                        })
                      }
                      aria-label={`Cantitate ${meta.label}`}
                    />
                    <select
                      className={selectClassName()}
                      disabled={!extra.enabled}
                      value={extra.side}
                      onChange={(event) =>
                        updateExtra(extra.id, {
                          side: event.target
                            .value as ExtraComponentConfig["side"],
                        })
                      }
                    >
                      <option value="shared">Comun</option>
                      <option value="front">Față</option>
                      <option value="back">Spate</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </fieldset>
        </>
      ) : null}
    </section>
  );
}

function LedSystemFields({
  title,
  system,
  widthMm,
  heightMm,
  shapeIsRectangular,
  canOverrideLedLength,
  onChange,
}: {
  title: string;
  system: LedSystemConfig;
  widthMm: number | null;
  heightMm: number | null;
  shapeIsRectangular: boolean;
  canOverrideLedLength: boolean;
  onChange: (patch: Partial<LedSystemConfig>) => void;
}) {
  const preview =
    widthMm !== null && heightMm !== null
      ? resolveLedLength({
          shapeIsRectangular,
          widthMm,
          heightMm,
          positioning: system.positioning,
          manualBaseLengthMm: system.manualBaseLengthMm,
          useManualOverride: system.useManualOverride,
        })
      : { error: "Dimensiuni incomplete" };

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-xs font-medium text-foreground">{title}</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label>Poziționare</Label>
          <select
            className={selectClassName()}
            value={system.positioning}
            onChange={(event) =>
              onChange({
                positioning: event.target.value as LedPositioning,
              })
            }
          >
            {LED_POSITIONINGS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Tip bandă LED</Label>
          <select
            className={selectClassName()}
            value={system.stripTypeId}
            onChange={(event) =>
              onChange({
                stripTypeId: event.target
                  .value as LedSystemConfig["stripTypeId"],
              })
            }
          >
            {LED_STRIP_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {!item.materialSeedKey ? " — preț neconfigurat" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label>Temperatură</Label>
          <select
            className={selectClassName()}
            value={String(system.temperatureK)}
            onChange={(event) =>
              onChange({
                temperatureK: Number(
                  event.target.value,
                ) as LedSystemConfig["temperatureK"],
              })
            }
          >
            {LED_TEMPERATURES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Salvată în config; nu modifică prețul fără regulă explicită.
          </p>
        </div>
      </div>

      {"error" in preview ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          {preview.error.includes("Lungime LED de confirmat")
            ? "Lungime LED de confirmat"
            : preview.error}
        </p>
      ) : (
        <dl className="grid gap-1 rounded-md border border-border bg-muted/20 px-3 py-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Lungime bază</dt>
            <dd>{preview.baseLengthM.toFixed(2)} m</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Supliment 10%</dt>
            <dd>{preview.supplementM.toFixed(2)} m</dd>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2">
            <dt className="text-muted-foreground">Lungime totală</dt>
            <dd className="font-medium">
              {preview.totalLengthM.toFixed(2)} m
              {preview.source === "manual" ? " (manual)" : ""}
            </dd>
          </div>
          <div className="flex justify-between gap-2 sm:col-span-2 text-xs text-muted-foreground">
            <dt>Cost LED</dt>
            <dd>
              se calculează din catalog (lungime × preț/m) — vezi sumar
            </dd>
          </div>
        </dl>
      )}

      {!shapeIsRectangular && !system.useManualOverride ? (
        <div className="grid gap-1.5">
          <Label>Lungime de bază (mm) — formulă neconfirmată</Label>
          <Input
            inputMode="decimal"
            value={
              system.manualBaseLengthMm === null
                ? ""
                : String(system.manualBaseLengthMm)
            }
            onChange={(event) => {
              const raw = event.target.value.trim();
              onChange({
                manualBaseLengthMm: raw === "" ? null : Number(raw),
              });
            }}
            className={
              !system.manualBaseLengthMm
                ? "border-amber-500/60 ring-1 ring-amber-500/20"
                : undefined
            }
          />
          <p className="text-xs text-muted-foreground">
            Introduceți lungimea de bază; suplimentul 10% se aplică o singură
            dată.
          </p>
        </div>
      ) : null}

      {canOverrideLedLength ? (
        <div
          className={
            system.useManualOverride
              ? "space-y-2 rounded-md border border-amber-500/50 bg-amber-500/10 p-3"
              : "space-y-2 rounded-md border border-dashed border-border p-3"
          }
        >
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={system.useManualOverride}
              onChange={(event) =>
                onChange({ useManualOverride: event.target.checked })
              }
            />
            Override ADMIN lungime LED
          </label>
          {system.useManualOverride ? (
            <>
              <div className="grid gap-1.5">
                <Label>Lungime bază override (mm)</Label>
                <Input
                  inputMode="decimal"
                  value={
                    system.manualBaseLengthMm === null
                      ? ""
                      : String(system.manualBaseLengthMm)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    onChange({
                      manualBaseLengthMm: raw === "" ? null : Number(raw),
                    });
                  }}
                  className="border-amber-500/70"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Motiv (obligatoriu)</Label>
                <Input
                  value={system.manualOverrideReason}
                  onChange={(event) =>
                    onChange({ manualOverrideReason: event.target.value })
                  }
                  className="border-amber-500/70"
                  placeholder="Ex: contur special validat pe schiță"
                />
              </div>
              {"error" in preview ? null : (
                <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                  Valoare modificată: {roundMoney(preview.totalLengthM).toFixed(2)}{" "}
                  m total (10% aplicat o dată pe baza manuală)
                </p>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </fieldset>
  );
}
