"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  visibleConfiguratorItems,
  type ConfiguratorItemSetting,
} from "@/modules/configurator/layout";
import {
  BRANDING_OPTIONS,
  CUTOUT_TYPES,
  DEFOG_CONTROLS,
  FACET_SHAPES,
  FACET_WIDTHS,
  FRAME_TYPES,
  MOUNTING_TYPES,
  PRODUCT_ACCESSORIES,
  SANDBLAST_FINISHES,
  computeSandblastBandsAreaM2,
  frameLengthM,
  mirrorPerimeterM,
  type CutoutTypeId,
  type ProcessingConfig,
  type SandblastFinishId,
} from "@/modules/configurator/processing";

export type ProcessingPart =
  | "processing"
  | "defog"
  | "frames"
  | "cutouts"
  | "accessories"
  | "branding";

type ProcessingSectionsProps = {
  processing: ProcessingConfig;
  widthMm: number | null;
  heightMm: number | null;
  shapeIsRectangular: boolean;
  shapeId?: string;
  onChange: (next: ProcessingConfig) => void;
  /** When set, only that category is rendered. */
  only?: ProcessingPart;
  /** Saved elements. Missing means every element stays visible, in the default order. */
  items?: ConfiguratorItemSetting[];
};

function selectClass() {
  return "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";
}

export function ProcessingSections({
  processing,
  widthMm,
  heightMm,
  shapeIsRectangular,
  shapeId,
  onChange,
  only,
  items,
}: ProcessingSectionsProps) {
  function patch(partial: Partial<ProcessingConfig>) {
    onChange({ ...processing, ...partial });
  }

  const sandblastActive = processing.sandblastFinish !== "none";
  const standardSandblast = processing.sandblastFinish === "standard";
  const bandsArea = computeSandblastBandsAreaM2(processing.sandblastBands);
  const glassAreaM2 =
    shapeIsRectangular && widthMm != null && heightMm != null && widthMm > 0 && heightMm > 0
      ? (widthMm * heightMm) / 1_000_000
      : null;
  const perimeterM =
    widthMm != null && heightMm != null
      ? mirrorPerimeterM(widthMm, heightMm, shapeIsRectangular)
      : null;
  const frameOutline =
    widthMm != null && heightMm != null
      ? frameLengthM(widthMm, heightMm, shapeIsRectangular, shapeId)
      : null;

  const show = (part: ProcessingPart) => !only || only === part;
  const processingOrder = visibleConfiguratorItems(items, [
    "sandblast",
    "facet",
    "engraving",
  ]);
  const frameOrder = visibleConfiguratorItems(items, ["frame", "mounting", "hardware"]);
  const accessoryOrder = visibleConfiguratorItems(
    items,
    PRODUCT_ACCESSORIES.map((item) => item.id),
  );
  const brandingOrder = visibleConfiguratorItems(
    items,
    BRANDING_OPTIONS.map((item) => item.id),
  );

  function place(order: string[], id: string) {
    const index = order.indexOf(id);
    return index < 0 ? null : index;
  }

  return (
    <>
      {show("processing") && processingOrder.length > 0 ? (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold text-foreground" style={{ order: -1 }}>
          Prelucrări
        </h2>

        {place(processingOrder, "sandblast") != null ? (
        <div className="space-y-3" style={{ order: place(processingOrder, "sandblast")! }}>
        <div className="grid gap-2">
          <Label>Sablare decorativă</Label>
          <select
            className={selectClass()}
            value={processing.sandblastFinish}
            onChange={(event) =>
              patch({
                sandblastFinish: event.target.value as SandblastFinishId,
              })
            }
          >
            {SANDBLAST_FINISHES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
                {item.id !== "none" && !item.materialSeedKey
                  ? " — tarif neconfirmat"
                  : ""}
              </option>
            ))}
          </select>
        </div>

        {standardSandblast ? (
          <p className="text-sm text-muted-foreground">
            {glassAreaM2 != null
              ? `Suprafață oglindă: ${glassAreaM2.toLocaleString("ro-RO", { maximumFractionDigits: 4 })} m² × tariful de sablare din catalog.`
              : "Suprafața oglinzii nu este confirmată pentru această formă."}
          </p>
        ) : null}

        {sandblastActive && !standardSandblast ? (
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium">Arie sablată</legend>
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={processing.sandblastAreaMode === "direct"}
                  onChange={() => patch({ sandblastAreaMode: "direct" })}
                />
                Arie directă (m²)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={processing.sandblastAreaMode === "bands"}
                  onChange={() => patch({ sandblastAreaMode: "bands" })}
                />
                Benzi dreptunghiulare
              </label>
            </div>
            {processing.sandblastAreaMode === "direct" ? (
              <div className="grid gap-1.5 max-w-xs">
                <Label>Arie (m²)</Label>
                <Input
                  inputMode="decimal"
                  value={String(processing.sandblastAreaM2 || "")}
                  onChange={(event) =>
                    patch({
                      sandblastAreaM2: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
            ) : (
              <div className="space-y-2">
                {processing.sandblastBands.map((band, index) => (
                  <div
                    key={`band-${index}`}
                    className="grid gap-2 sm:grid-cols-4"
                  >
                    <div className="grid gap-1">
                      <Label>Nr. benzi</Label>
                      <Input
                        inputMode="numeric"
                        value={String(band.count)}
                        onChange={(event) => {
                          const sandblastBands = [...processing.sandblastBands];
                          sandblastBands[index] = {
                            ...band,
                            count: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                          };
                          patch({ sandblastBands });
                        }}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Lungime (mm)</Label>
                      <Input
                        inputMode="decimal"
                        value={String(band.lengthMm || "")}
                        onChange={(event) => {
                          const sandblastBands = [...processing.sandblastBands];
                          sandblastBands[index] = {
                            ...band,
                            lengthMm: Number(event.target.value) || 0,
                          };
                          patch({ sandblastBands });
                        }}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Lățime (mm)</Label>
                      <Input
                        inputMode="decimal"
                        value={String(band.widthMm || "")}
                        onChange={(event) => {
                          const sandblastBands = [...processing.sandblastBands];
                          sandblastBands[index] = {
                            ...band,
                            widthMm: Number(event.target.value) || 0,
                          };
                          patch({ sandblastBands });
                        }}
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        className="h-9 rounded-lg border border-border px-3 text-sm"
                        onClick={() =>
                          patch({
                            sandblastBands: processing.sandblastBands.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        Elimină
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="h-9 rounded-lg border border-border px-3 text-sm"
                  onClick={() =>
                    patch({
                      sandblastBands: [
                        ...processing.sandblastBands,
                        { count: 1, lengthMm: 0, widthMm: 0 },
                      ],
                    })
                  }
                >
                  Adaugă bandă
                </button>
                <p className="text-xs text-muted-foreground">
                  Arie totală benzi: {bandsArea.toFixed(4)} m²
                </p>
              </div>
            )}
            {processing.sandblastFinish !== "standard" ? (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Tarif vopsit / laser neconfirmat — configurație admin necesară.
              </p>
            ) : null}
          </fieldset>
        ) : null}
        </div>
        ) : null}

        {place(processingOrder, "facet") != null ? (
        <fieldset
          className="space-y-3 rounded-lg border border-border p-3"
          style={{ order: place(processingOrder, "facet")! }}
        >
          <legend className="px-1 text-xs font-medium">Fațete</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={processing.facetEnabled}
              onChange={(event) =>
                patch({ facetEnabled: event.target.checked })
              }
            />
            Activează fațetă
          </label>
          {processing.facetEnabled ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label>Tip</Label>
                <select
                  className={selectClass()}
                  value={processing.facetShape}
                  onChange={(event) =>
                    patch({
                      facetShape: event.target
                        .value as ProcessingConfig["facetShape"],
                    })
                  }
                >
                  {FACET_SHAPES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-1.5">
                <Label>Lățime</Label>
                <select
                  className={selectClass()}
                  value={String(processing.facetWidthMm)}
                  onChange={(event) =>
                    patch({
                      facetWidthMm: Number(
                        event.target.value,
                      ) as ProcessingConfig["facetWidthMm"],
                    })
                  }
                >
                  {FACET_WIDTHS.map((width) => (
                    <option key={width} value={width}>
                      {width} mm — tarif neconfirmat
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-muted-foreground sm:col-span-3">
                {perimeterM != null
                  ? `Perimetru: ${perimeterM.toLocaleString("ro-RO", { maximumFractionDigits: 3 })} m`
                  : "Perimetrul nu este confirmat pentru această formă."}
              </p>
            </div>
          ) : null}
        </fieldset>
        ) : null}

        {place(processingOrder, "engraving") != null ? (
        <fieldset
          className="space-y-3 rounded-lg border border-border p-3"
          style={{ order: place(processingOrder, "engraving")! }}
        >
          <legend className="px-1 text-xs font-medium">Gravură</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={processing.engravingEnabled}
              onChange={(event) =>
                patch({ engravingEnabled: event.target.checked })
              }
            />
            Gravură personalizată
          </label>
          {processing.engravingEnabled ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5 sm:col-span-2">
                <Label>Descriere</Label>
                <Input
                  value={processing.engravingDescription}
                  onChange={(event) =>
                    patch({ engravingDescription: event.target.value })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground sm:col-span-3">
                {glassAreaM2 != null
                  ? `Suprafață oglindă: ${glassAreaM2.toLocaleString("ro-RO", { maximumFractionDigits: 4 })} m². Tariful se setează la materialul Gravură.`
                  : "Suprafața oglinzii nu este confirmată pentru această formă."}
              </p>
            </div>
          ) : null}
        </fieldset>
        ) : null}
      </section>
      ) : null}

      {show("defog") ? (
      <section className="space-y-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold">Dezaburire</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={processing.defogEnabled}
            onChange={(event) => patch({ defogEnabled: event.target.checked })}
          />
          Include dezaburire
        </label>
        {processing.defogEnabled ? (
          <div className="grid max-w-sm gap-1.5">
            <Label>Mod de control</Label>
            <select
              className={selectClass()}
              value={processing.defogControl}
              onChange={(event) =>
                patch({
                  defogControl: event.target
                    .value as ProcessingConfig["defogControl"],
                })
              }
            >
              {DEFOG_CONTROLS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </section>
      ) : null}

      {show("frames") && frameOrder.length > 0 ? (
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold" style={{ order: -1 }}>
          Rame și fixare
        </h2>
        {place(frameOrder, "frame") != null ? (
        <div className="grid gap-3 sm:grid-cols-2" style={{ order: place(frameOrder, "frame")! }}>
          <div className="grid gap-1.5">
            <Label>Tip ramă</Label>
            <select
              className={selectClass()}
              value={processing.frameType}
              onChange={(event) =>
                patch({
                  frameType: event.target
                    .value as ProcessingConfig["frameType"],
                })
              }
            >
              {FRAME_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                  {item.id !== "none" && !item.materialSeedKey
                    ? " — tarif neconfirmat"
                    : ""}
                </option>
              ))}
            </select>
          </div>
          {processing.frameType !== "none" && frameOutline ? (
            <div className="grid gap-1 rounded-lg border border-border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground">Lungime ramă</p>
              <p className="text-sm font-medium">{frameOutline.meters.toFixed(2)} m</p>
              <p className="text-xs text-muted-foreground">
                {shapeId === "round"
                  ? `Diametru ${widthMm} mm × 3,14`
                  : "Perimetrul oglinzii"}
              </p>
            </div>
          ) : null}
          {processing.frameType !== "none" && !frameOutline ? (
            <div className="grid gap-1.5">
              <Label>Consum, metri</Label>
              <Input
                inputMode="decimal"
                value={String(processing.frameConsumptionQty || "")}
                onChange={(event) =>
                  patch({
                    frameConsumptionQty: Number(event.target.value) || 0,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Această formă nu are lungime automată. Scrieți metrii.
              </p>
            </div>
          ) : null}
        </div>
        ) : null}

        {place(frameOrder, "mounting") != null ? (
        <div className="grid max-w-sm gap-1.5" style={{ order: place(frameOrder, "mounting")! }}>
          <Label>Tip montaj</Label>
          <select
            className={selectClass()}
            value={processing.mountingType}
            onChange={(event) =>
              patch({
                mountingType: event.target
                  .value as ProcessingConfig["mountingType"],
              })
            }
          >
            {MOUNTING_TYPES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        ) : null}

        {place(frameOrder, "hardware") != null ? (
        <fieldset
          className="space-y-2 rounded-lg border border-border p-3"
          style={{ order: place(frameOrder, "hardware")! }}
        >
          <legend className="px-1 text-xs font-medium">
            Componente fixare (configurabile)
          </legend>
          {processing.mountingComponents.map((comp, index) => (
            <div key={`mount-${index}`} className="grid gap-2 sm:grid-cols-3">
              <Input
                value={comp.label}
                onChange={(event) => {
                  const mountingComponents = [
                    ...processing.mountingComponents,
                  ];
                  mountingComponents[index] = {
                    ...comp,
                    label: event.target.value,
                  };
                  patch({ mountingComponents });
                }}
              />
              <Input
                inputMode="decimal"
                value={String(comp.qty || "")}
                onChange={(event) => {
                  const mountingComponents = [
                    ...processing.mountingComponents,
                  ];
                  mountingComponents[index] = {
                    ...comp,
                    qty: Number(event.target.value) || 0,
                  };
                  patch({ mountingComponents });
                }}
                placeholder="Cantitate"
              />
              <p className="self-center text-xs text-muted-foreground">
                {comp.materialSeedKey
                  ? "Material asociat"
                  : "Preț neconfigurat"}
              </p>
            </div>
          ))}
          <button
            type="button"
            className="h-9 rounded-lg border border-border px-3 text-sm"
            onClick={() =>
              patch({
                mountingComponents: [
                  ...processing.mountingComponents,
                  {
                    label: "Componentă fixare",
                    qty: 0,
                    materialSeedKey: null,
                  },
                ],
              })
            }
          >
            Adaugă componentă
          </button>
        </fieldset>
        ) : null}
      </section>
      ) : null}

      {show("cutouts") ? (
      <section className="space-y-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold">Găuri și decupaje</h2>
        {processing.cutouts.map((cutout, index) => (
          <div
            key={`cut-${index}`}
            className="grid gap-2 rounded-md border border-border/70 p-2 sm:grid-cols-5"
          >
            <select
              className={selectClass()}
              value={cutout.type}
              onChange={(event) => {
                const cutouts = [...processing.cutouts];
                cutouts[index] = {
                  ...cutout,
                  type: event.target.value as CutoutTypeId,
                };
                patch({ cutouts });
              }}
            >
              {CUTOUT_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <Input
              inputMode="numeric"
              value={String(cutout.qty)}
              onChange={(event) => {
                const cutouts = [...processing.cutouts];
                cutouts[index] = {
                  ...cutout,
                  qty: Math.max(0, Math.floor(Number(event.target.value) || 0)),
                };
                patch({ cutouts });
              }}
              placeholder="Qty"
            />
            <Input
              inputMode="decimal"
              value={cutout.diameterMm === null ? "" : String(cutout.diameterMm)}
              onChange={(event) => {
                const raw = event.target.value.trim();
                const cutouts = [...processing.cutouts];
                cutouts[index] = {
                  ...cutout,
                  diameterMm: raw === "" ? null : Number(raw),
                };
                patch({ cutouts });
              }}
              placeholder="Ø mm"
            />
            <Input
              inputMode="decimal"
              value={
                cutout.widthMm === null
                  ? ""
                  : `${cutout.widthMm}${cutout.heightMm != null ? "" : ""}`
              }
              onChange={(event) => {
                const raw = event.target.value.trim();
                const cutouts = [...processing.cutouts];
                cutouts[index] = {
                  ...cutout,
                  widthMm: raw === "" ? null : Number(raw),
                };
                patch({ cutouts });
              }}
              placeholder="Lățime mm"
            />
            <div className="flex gap-2">
              <Input
                inputMode="decimal"
                value={
                  cutout.heightMm === null ? "" : String(cutout.heightMm)
                }
                onChange={(event) => {
                  const raw = event.target.value.trim();
                  const cutouts = [...processing.cutouts];
                  cutouts[index] = {
                    ...cutout,
                    heightMm: raw === "" ? null : Number(raw),
                  };
                  patch({ cutouts });
                }}
                placeholder="Înălțime mm"
              />
              <button
                type="button"
                className="h-9 shrink-0 rounded-lg border border-border px-2 text-sm"
                onClick={() =>
                  patch({
                    cutouts: processing.cutouts.filter((_, i) => i !== index),
                  })
                }
              >
                ×
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          className="h-9 rounded-lg border border-border px-3 text-sm"
          onClick={() =>
            patch({
              cutouts: [
                ...processing.cutouts,
                {
                  type: "hole-le-50",
                  qty: 1,
                  diameterMm: null,
                  widthMm: null,
                  heightMm: null,
                },
              ],
            })
          }
        >
          Adaugă gaură / decupaj
        </button>
      </section>
      ) : null}

      {show("accessories") && accessoryOrder.length > 0 ? (
      <section className="space-y-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold">Accesorii</h2>
        <div className="grid gap-2">
          {accessoryOrder.map((id) => {
            const acc = processing.accessories.find((item) => item.id === id);
            if (!acc) {
              return null;
            }
            const meta = PRODUCT_ACCESSORIES.find((item) => item.id === acc.id)!;
            return (
              <div
                key={acc.id}
                className="grid gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-[auto_1fr_90px]"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={acc.enabled}
                    onChange={(event) =>
                      patch({
                        accessories: processing.accessories.map((item) =>
                          item.id === acc.id
                            ? { ...item, enabled: event.target.checked }
                            : item,
                        ),
                      })
                    }
                  />
                  {meta.label}
                </label>
                <Input
                  disabled={!acc.enabled}
                  value={acc.note}
                  onChange={(event) =>
                    patch({
                      accessories: processing.accessories.map((item) =>
                        item.id === acc.id
                          ? { ...item, note: event.target.value }
                          : item,
                      ),
                    })
                  }
                  placeholder="Opțiuni tehnice / notă"
                />
                <Input
                  disabled={!acc.enabled}
                  inputMode="numeric"
                  value={String(acc.qty)}
                  onChange={(event) =>
                    patch({
                      accessories: processing.accessories.map((item) =>
                        item.id === acc.id
                          ? {
                              ...item,
                              qty: Math.max(
                                0,
                                Math.floor(Number(event.target.value) || 0),
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
      ) : null}

      {show("branding") && brandingOrder.length > 0 ? (
      <section className="space-y-3 rounded-xl border border-border bg-card p-3">
        <h2 className="text-sm font-semibold">Branding și protecție</h2>
        <div className="grid gap-2">
          {brandingOrder.map((id) => {
            const brand = processing.branding.find((item) => item.id === id);
            if (!brand) {
              return null;
            }
            const meta = BRANDING_OPTIONS.find((item) => item.id === brand.id)!;
            return (
              <div
                key={brand.id}
                className="grid gap-2 rounded-md border border-border/60 p-2 sm:grid-cols-[1fr_90px]"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={brand.enabled}
                    onChange={(event) =>
                      patch({
                        branding: processing.branding.map((item) =>
                          item.id === brand.id
                            ? { ...item, enabled: event.target.checked }
                            : item,
                        ),
                      })
                    }
                  />
                  {meta.label}
                  {!meta.materialSeedKey ? (
                    <span className="text-xs text-muted-foreground">
                      — preț neconfigurat
                    </span>
                  ) : null}
                </label>
                <Input
                  disabled={!brand.enabled || meta.areaBased}
                  inputMode="numeric"
                  value={String(brand.qty)}
                  onChange={(event) =>
                    patch({
                      branding: processing.branding.map((item) =>
                        item.id === brand.id
                          ? {
                              ...item,
                              qty: Math.max(
                                0,
                                Math.floor(Number(event.target.value) || 0),
                              ),
                            }
                          : item,
                      ),
                    })
                  }
                  title={
                    meta.areaBased
                      ? "Cantitatea urmează aria oglinzii când materialul e asociat"
                      : undefined
                  }
                />
              </div>
            );
          })}
        </div>
      </section>
      ) : null}
    </>
  );
}
