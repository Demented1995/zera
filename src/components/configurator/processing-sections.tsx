"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BRANDING_OPTIONS,
  CUTOUT_TYPES,
  DEFOG_CONTROLS,
  DEFOG_SIZES,
  FACET_SHAPES,
  FACET_WIDTHS,
  FRAME_TYPES,
  MOUNTING_TYPES,
  PRODUCT_ACCESSORIES,
  SANDBLAST_FINISHES,
  computeSandblastBandsAreaM2,
  type CutoutTypeId,
  type ProcessingConfig,
  type SandblastFinishId,
} from "@/modules/configurator/processing";

type ProcessingSectionsProps = {
  processing: ProcessingConfig;
  onChange: (next: ProcessingConfig) => void;
};

function selectClass() {
  return "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";
}

export function ProcessingSections({
  processing,
  onChange,
}: ProcessingSectionsProps) {
  function patch(partial: Partial<ProcessingConfig>) {
    onChange({ ...processing, ...partial });
  }

  const sandblastActive = processing.sandblastFinish !== "none";
  const bandsArea = computeSandblastBandsAreaM2(processing.sandblastBands);

  return (
    <div className="space-y-5">
      {/* Prelucrări */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Prelucrări</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sablare decorativă, fațete și gravură. Sablarea simbolului touch este
            inclusă în senzor — nu se taxează separat.
          </p>
        </div>

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

        {sandblastActive ? (
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
                  Arie totală benzi: {bandsArea.toFixed(4)} m² · minim 100 MDL
                  o dată pe operațiune (nu pe bandă).
                </p>
              </div>
            )}
            {processing.sandblastFinish === "standard" ? (
              <p className="text-xs text-muted-foreground">
                Standard: max(100, arie × 600) MDL din catalog.
              </p>
            ) : (
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Tarif vopsit / laser neconfirmat — configurație admin necesară.
              </p>
            )}
          </fieldset>
        ) : null}

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
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
              <div className="grid gap-1.5">
                <Label>Lungime prelucrată (m)</Label>
                <Input
                  inputMode="decimal"
                  value={String(processing.facetLengthM || "")}
                  onChange={(event) =>
                    patch({
                      facetLengthM: Number(event.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-border p-3">
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
              <div className="grid gap-1.5">
                <Label>Cantitate</Label>
                <Input
                  inputMode="numeric"
                  value={String(processing.engravingQty)}
                  onChange={(event) =>
                    patch({
                      engravingQty: Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0),
                      ),
                    })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Cost admin (MDL/buc)</Label>
                <Input
                  inputMode="decimal"
                  value={
                    processing.engravingUnitCost === null
                      ? ""
                      : String(processing.engravingUnitCost)
                  }
                  onChange={(event) => {
                    const raw = event.target.value.trim();
                    patch({
                      engravingUnitCost: raw === "" ? null : Number(raw),
                    });
                  }}
                  placeholder="neconfigurat"
                />
              </div>
            </div>
          ) : null}
        </fieldset>
      </section>

      {/* Dezaburire */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Dezaburire</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Dimensiuni 300×400 / 400×500. Touch dezaburire ≠ touch LED — senzor
            extra taxat separat. Folie din catalog.
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={processing.defogEnabled}
            onChange={(event) => patch({ defogEnabled: event.target.checked })}
          />
          Include dezaburire
        </label>
        {processing.defogEnabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Dimensiune</Label>
              <select
                className={selectClass()}
                value={processing.defogSize}
                onChange={(event) =>
                  patch({
                    defogSize: event.target
                      .value as ProcessingConfig["defogSize"],
                  })
                }
              >
                {DEFOG_SIZES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Comandă</Label>
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
            <div className="grid gap-1.5">
              <Label>Cantitate</Label>
              <Input
                inputMode="numeric"
                value={String(processing.defogQty)}
                onChange={(event) =>
                  patch({
                    defogQty: Math.max(
                      0,
                      Math.floor(Number(event.target.value) || 0),
                    ),
                  })
                }
              />
            </div>
          </div>
        ) : null}
      </section>

      {/* Rame și fixare */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Rame și fixare</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Perimetru auto doar după regulă admin confirmată. Fixare cu
            cantități explicite.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
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
          {processing.frameType !== "none" ? (
            <div className="grid gap-1.5">
              <Label>Consum explicit</Label>
              <Input
                inputMode="decimal"
                value={String(processing.frameConsumptionQty || "")}
                onChange={(event) =>
                  patch({
                    frameConsumptionQty: Number(event.target.value) || 0,
                  })
                }
              />
            </div>
          ) : null}
        </div>

        <div className="grid gap-1.5 max-w-sm">
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

        <fieldset className="space-y-2 rounded-lg border border-border p-3">
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
      </section>

      {/* Găuri și decupaje */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Găuri și decupaje</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prețuri din catalog — lipsă tarif → INCOMPLETE.
          </p>
        </div>
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

      {/* Accesorii */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Accesorii</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Prețuri configurabile din catalog — nimic inventat.
          </p>
        </div>
        <div className="grid gap-2">
          {processing.accessories.map((acc) => {
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

      {/* Branding și protecție */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">Branding și protecție</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Folie anti-ciobire pe aria oglinzii doar dacă materialul are tarif
            m².
          </p>
        </div>
        <div className="grid gap-2">
          {processing.branding.map((brand) => {
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
    </div>
  );
}
