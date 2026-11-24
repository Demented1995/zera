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
  withLedTechnicalExtras,
  type ExtraComponentConfig,
  type LedSystemConfig,
  type LightingConfig,
  type LightingType,
  type SwitchConfig,
} from "@/modules/configurator/lighting";
import {
  visibleConfiguratorItems,
  type ConfiguratorItemSetting,
} from "@/modules/configurator/layout";
import {
  resolveLedLength,
  type LedPositioning,
} from "@/modules/pricing/engine/led-length";

type LightingSectionProps = {
  lighting: LightingConfig;
  widthMm: number | null;
  heightMm: number | null;
  shapeIsRectangular: boolean;
  shapeId?: string;
  /** Model setup leaves LED color to the customer. */
  showTemperature?: boolean;
  /** Saved elements. Missing means every element stays visible, in the default order. */
  items?: ConfiguratorItemSetting[];
  /** Model setup: choosing LED checks every supplementary component, including the transformer. */
  checkExtrasWithLed?: boolean;
  /** Extras configured in the rules, so the model checklist does not repeat them. */
  hiddenExtraIds?: readonly string[];
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
  shapeId,
  showTemperature = true,
  items,
  checkExtrasWithLed = false,
  hiddenExtraIds,
  onChange,
}: LightingSectionProps) {
  const hiddenExtras = new Set<string>(hiddenExtraIds ?? []);

  function setLightingType(lightingType: LightingType) {
    const turningLedOn =
      checkExtrasWithLed &&
      lighting.lightingType === "none" &&
      lightingType !== "none";
    const next = turningLedOn ? withLedTechnicalExtras(lighting) : lighting;
    onChange({
      ...next,
      lightingType,
      extraComponents: next.extraComponents.map((item) =>
        hiddenExtras.has(item.id) ? { ...item, enabled: false, qty: 0 } : item,
      ),
    });
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
  const order = visibleConfiguratorItems(items, [
    "type",
    "front",
    "back",
    "diffuser",
    "switches",
    "power",
    "extras",
  ]);

  function place(id: string) {
    const index = order.indexOf(id);
    return index < 0 ? null : index;
  }

  if (order.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
      <h2 className="text-sm font-semibold text-foreground" style={{ order: -1 }}>
        Iluminare LED
      </h2>

      {place("type") != null ? (
      <div className="grid gap-2" style={{ order: place("type")! }}>
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
      ) : null}

      {showFront && place("front") != null ? (
        <div style={{ order: place("front")! }}>
        <LedSystemFields
          title="LED față"
          system={lighting.front}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          shapeId={shapeId}
          showTemperature={showTemperature}
          onChange={patchFront}
        />
        </div>
      ) : null}

      {showBack && place("back") != null ? (
        <div style={{ order: place("back")! }}>
        <LedSystemFields
          title="LED spate"
          system={lighting.back}
          widthMm={widthMm}
          heightMm={heightMm}
          shapeIsRectangular={shapeIsRectangular}
          shapeId={shapeId}
          showTemperature={showTemperature}
          onChange={patchBack}
        />
        </div>
      ) : null}

      {showBack && place("diffuser") != null ? (
        <label
          className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm"
          style={{ order: place("diffuser")! }}
        >
          <input
            type="checkbox"
            className="mt-0.5"
            checked={lighting.offerDiffuser === true}
            onChange={(event) =>
              onChange({ ...lighting, offerDiffuser: event.target.checked })
            }
          />
          <span>
            <span className="font-medium">Difuzor de iluminare</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Bifat, clientul poate alege difuzorul pe pagina produsului. Debifat,
              opțiunea nu apare.
            </span>
          </span>
        </label>
      ) : null}

      {showElectrical && place("switches") != null ? (
          <fieldset
            className="space-y-2 rounded-lg border border-border p-2.5"
            style={{ order: place("switches")! }}
          >
            <legend className="px-1 text-xs font-medium text-foreground">
              Comenzi / întrerupătoare
            </legend>
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
      ) : null}

      {showElectrical && place("power") != null ? (
          <fieldset
            className="grid gap-3 rounded-lg border border-border p-3"
            style={{ order: place("power")! }}
          >
            <legend className="px-1 text-xs font-medium text-foreground">
              Alimentare
            </legend>
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
            </div>
          </fieldset>
      ) : null}

      {showElectrical && place("extras") != null ? (
          <fieldset
            className="space-y-2 rounded-lg border border-border p-2.5"
            style={{ order: place("extras")! }}
          >
            <legend className="px-1 text-xs font-medium text-foreground">
              Componente tehnice suplimentare
            </legend>
            <div className="grid gap-2">
              <label className="flex items-center gap-2 rounded-md border border-border/60 p-2 text-sm">
                <input
                  type="checkbox"
                  checked={lighting.transformerPcs > 0}
                  onChange={(event) =>
                    onChange({
                      ...lighting,
                      transformerPcs: event.target.checked ? 1 : 0,
                    })
                  }
                />
                <span>Transformator</span>
              </label>
              {lighting.extraComponents
                .filter((extra) => !hiddenExtras.has(extra.id))
                .map((extra) => {
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
  shapeId,
  showTemperature,
  onChange,
}: {
  title: string;
  system: LedSystemConfig;
  widthMm: number | null;
  heightMm: number | null;
  shapeIsRectangular: boolean;
  shapeId?: string;
  showTemperature: boolean;
  onChange: (patch: Partial<LedSystemConfig>) => void;
}) {
  const preview =
    widthMm !== null && heightMm !== null
      ? resolveLedLength({
          shapeIsRectangular,
          shapeId,
          widthMm,
          heightMm,
          positioning: system.positioning,
          manualBaseLengthMm: system.manualBaseLengthMm,
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
        {showTemperature ? (
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
          </div>
        ) : null}
      </div>

      {"error" in preview ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
          {preview.error.includes("Lungime LED de confirmat")
            ? "Lungime LED de confirmat"
            : preview.error}
        </p>
      ) : null}

      {!shapeIsRectangular &&
      shapeId !== "round" &&
      (shapeId !== "arcade" || "error" in preview) ? (
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
        </div>
      ) : null}
    </fieldset>
  );
}
