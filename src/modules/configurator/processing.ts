import { MATERIAL_SEED_KEYS } from "@/modules/pricing/engine";
import type { DetailedComponentLine } from "@/modules/pricing/engine/types";

/** Decorative sandblast finish. Only standard has a confirmed catalog rate. */
export type SandblastFinishId = "none" | "standard" | "painted" | "laser";

export type SandblastAreaMode = "direct" | "bands";

export type SandblastBand = {
  count: number;
  lengthMm: number;
  widthMm: number;
};

export type FacetShapeId = "straight" | "curved";
export type FacetWidthMm = 10 | 15 | 20;

export type DefogSizeId = "300x400" | "400x500";
export type DefogControlId = "mechanical" | "touch";

export type FrameTypeId =
  | "none"
  | "aluminium-corner-10"
  | "aluminium-rectangular"
  | "aluminium-special"
  | "mdf-painted"
  | "wood";

export type MountingTypeId = "standard" | "with-frame";

export type CutoutTypeId = "hole-le-50" | "hole-gt-50" | "custom";

export type ProductAccessoryId =
  | "clock"
  | "magnifying-mirror"
  | "multimedia-screen"
  | "interactive-joystick";

export type BrandingOptionId =
  | "logo-lit"
  | "logo-unlit"
  | "painting"
  | "anti-shatter-film";

export const SANDBLAST_FINISHES: Array<{
  id: SandblastFinishId;
  label: string;
  /** Confirmed catalog association; null = admin must configure. */
  materialSeedKey: string | null;
}> = [
  { id: "none", label: "Fără sablare decorativă", materialSeedKey: null },
  {
    id: "standard",
    label: "Sablare standard",
    materialSeedKey: MATERIAL_SEED_KEYS.sandblast,
  },
  { id: "painted", label: "Sablare vopsită", materialSeedKey: null },
  { id: "laser", label: "Sablare laser", materialSeedKey: null },
];

export const FACET_SHAPES: Array<{ id: FacetShapeId; label: string }> = [
  { id: "straight", label: "Dreaptă" },
  { id: "curved", label: "Curbă" },
];

export const FACET_WIDTHS: FacetWidthMm[] = [10, 15, 20];

/**
 * Facet tariffs are not confirmed — each shape×width needs its own admin rate.
 * Never assume the same rate for all widths/shapes.
 */
export const FACET_TARIFF_SEED: Record<
  `${FacetShapeId}-${FacetWidthMm}`,
  string | null
> = {
  "straight-10": null,
  "straight-15": null,
  "straight-20": null,
  "curved-10": null,
  "curved-15": null,
  "curved-20": null,
};

export const DEFOG_SIZES: Array<{ id: DefogSizeId; label: string }> = [
  { id: "300x400", label: "300 × 400 mm" },
  { id: "400x500", label: "400 × 500 mm" },
];

export const DEFOG_CONTROLS: Array<{
  id: DefogControlId;
  label: string;
}> = [
  { id: "mechanical", label: "Mecanic" },
  { id: "touch", label: "Touch (senzor separat)" },
];

export const FRAME_TYPES: Array<{
  id: FrameTypeId;
  label: string;
  materialSeedKey: string | null;
  /**
   * When true and admin confirms UOM + consumption rule, rectangular mirrors
   * may auto-compute perimeter consumption. Default false — do not invent.
   */
  rectangularPerimeterAuto: boolean;
}> = [
  { id: "none", label: "Fără ramă", materialSeedKey: null, rectangularPerimeterAuto: false },
  {
    id: "aluminium-corner-10",
    label: "Colțar aluminiu 10 mm",
    materialSeedKey: null,
    rectangularPerimeterAuto: false,
  },
  {
    id: "aluminium-rectangular",
    label: "Ramă aluminiu dreptunghiulară",
    materialSeedKey: null,
    rectangularPerimeterAuto: false,
  },
  {
    id: "aluminium-special",
    label: "Ramă aluminiu formă specială",
    materialSeedKey: null,
    rectangularPerimeterAuto: false,
  },
  {
    id: "mdf-painted",
    label: "MDF vopsit",
    materialSeedKey: null,
    rectangularPerimeterAuto: false,
  },
  {
    id: "wood",
    label: "Lemn",
    materialSeedKey: null,
    rectangularPerimeterAuto: false,
  },
];

export const MOUNTING_TYPES: Array<{ id: MountingTypeId; label: string }> = [
  { id: "standard", label: "Standard" },
  { id: "with-frame", label: "Cu ramă" },
];

export const CUTOUT_TYPES: Array<{
  id: CutoutTypeId;
  label: string;
  materialSeedKey: string | null;
}> = [
  { id: "hole-le-50", label: "Gaură ≤ 50 mm", materialSeedKey: null },
  { id: "hole-gt-50", label: "Gaură > 50 mm", materialSeedKey: null },
  { id: "custom", label: "Decupaj personalizat", materialSeedKey: null },
];

export const PRODUCT_ACCESSORIES: Array<{
  id: ProductAccessoryId;
  label: string;
  materialSeedKey: string | null;
}> = [
  { id: "clock", label: "Ceas", materialSeedKey: null },
  { id: "magnifying-mirror", label: "Oglindă măritoare", materialSeedKey: null },
  {
    id: "multimedia-screen",
    label: "Ecran multimedia",
    materialSeedKey: null,
  },
  {
    id: "interactive-joystick",
    label: "Joystick interactiv",
    materialSeedKey: null,
  },
];

export const BRANDING_OPTIONS: Array<{
  id: BrandingOptionId;
  label: string;
  materialSeedKey: string | null;
  /** When true, quantity may use mirror area (m²) if material UOM is m². */
  areaBased: boolean;
}> = [
  { id: "logo-lit", label: "Logo luminos", materialSeedKey: null, areaBased: false },
  { id: "logo-unlit", label: "Logo neluminos", materialSeedKey: null, areaBased: false },
  { id: "painting", label: "Vopsire", materialSeedKey: null, areaBased: false },
  {
    id: "anti-shatter-film",
    label: "Folie anti-ciobire",
    materialSeedKey: null,
    areaBased: true,
  },
];

export type ProcessingConfig = {
  sandblastFinish: SandblastFinishId;
  sandblastAreaMode: SandblastAreaMode;
  /** Direct decorative sandblast area in m². */
  sandblastAreaM2: number;
  sandblastBands: SandblastBand[];

  facetEnabled: boolean;
  facetShape: FacetShapeId;
  facetWidthMm: FacetWidthMm;
  /** Processed length in meters — required when facet enabled. */
  facetLengthM: number;

  engravingEnabled: boolean;
  engravingDescription: string;
  engravingQty: number;
  /** Admin-configurable unit cost; null = unconfigured. */
  engravingUnitCost: number | null;

  defogEnabled: boolean;
  defogSize: DefogSizeId;
  defogControl: DefogControlId;
  defogQty: number;

  frameType: FrameTypeId;
  /** Explicit consumption qty (meters/pcs) — no invented auto perimeter unless admin rule. */
  frameConsumptionQty: number;

  mountingType: MountingTypeId;
  /** Configurable mounting component lines (no auto fastener counts). */
  mountingComponents: Array<{
    label: string;
    qty: number;
    materialSeedKey: string | null;
  }>;

  cutouts: Array<{
    type: CutoutTypeId;
    qty: number;
    diameterMm: number | null;
    widthMm: number | null;
    heightMm: number | null;
  }>;

  accessories: Array<{
    id: ProductAccessoryId;
    enabled: boolean;
    qty: number;
    note: string;
  }>;

  branding: Array<{
    id: BrandingOptionId;
    enabled: boolean;
    qty: number;
  }>;
};

export function defaultProcessingConfig(): ProcessingConfig {
  return {
    sandblastFinish: "none",
    sandblastAreaMode: "direct",
    sandblastAreaM2: 0,
    sandblastBands: [{ count: 1, lengthMm: 0, widthMm: 0 }],
    facetEnabled: false,
    facetShape: "straight",
    facetWidthMm: 10,
    facetLengthM: 0,
    engravingEnabled: false,
    engravingDescription: "",
    engravingQty: 1,
    engravingUnitCost: null,
    defogEnabled: false,
    defogSize: "300x400",
    defogControl: "mechanical",
    defogQty: 1,
    frameType: "none",
    frameConsumptionQty: 0,
    mountingType: "standard",
    mountingComponents: [
      { label: "Element fixare (configurabil)", qty: 0, materialSeedKey: null },
    ],
    cutouts: [],
    accessories: PRODUCT_ACCESSORIES.map((item) => ({
      id: item.id,
      enabled: false,
      qty: 1,
      note: "",
    })),
    branding: BRANDING_OPTIONS.map((item) => ({
      id: item.id,
      enabled: false,
      qty: 1,
    })),
  };
}

/** Sum rectangular band areas in m². */
export function computeSandblastBandsAreaM2(bands: SandblastBand[]): number {
  let total = 0;
  for (const band of bands) {
    if (band.count <= 0 || band.lengthMm <= 0 || band.widthMm <= 0) {
      continue;
    }
    total += band.count * (band.lengthMm / 1000) * (band.widthMm / 1000);
  }
  return Math.round((total + Number.EPSILON) * 1e6) / 1e6;
}

export function resolveDecorativeSandblastAreaM2(
  processing: ProcessingConfig,
): number {
  if (processing.sandblastFinish === "none") {
    return 0;
  }
  if (processing.sandblastAreaMode === "bands") {
    return computeSandblastBandsAreaM2(processing.sandblastBands);
  }
  return processing.sandblastAreaM2 > 0 ? processing.sandblastAreaM2 : 0;
}

/**
 * Build detailed component lines for processing/accessories (Stage 5.3).
 * Standard decorative sandblast area is returned separately for the existing
 * engine OPERATION path (min charge once) — do not duplicate it here.
 */
export function buildProcessingDetailedComponents(options: {
  processing: ProcessingConfig;
  shapeIsRectangular: boolean;
  widthMm: number;
  heightMm: number;
  glassAreaM2: number | null;
}): {
  detailedComponents: DetailedComponentLine[];
  /** Fed into CalculationInput.decorativeSandblastAreaM2 for standard finish only. */
  decorativeSandblastAreaM2: number;
  blockers: string[];
} {
  const { processing, shapeIsRectangular, widthMm, heightMm, glassAreaM2 } =
    options;
  const detailedComponents: DetailedComponentLine[] = [];
  const blockers: string[] = [];
  let decorativeSandblastAreaM2 = 0;

  // --- Sandblast ---
  if (processing.sandblastFinish === "standard") {
    decorativeSandblastAreaM2 = resolveDecorativeSandblastAreaM2(processing);
    if (decorativeSandblastAreaM2 <= 0) {
      blockers.push(
        "Sablare standard: introduceți aria decorativă (m²) sau benzile.",
      );
    }
  } else if (
    processing.sandblastFinish === "painted" ||
    processing.sandblastFinish === "laser"
  ) {
    const finish = SANDBLAST_FINISHES.find(
      (item) => item.id === processing.sandblastFinish,
    )!;
    const area = resolveDecorativeSandblastAreaM2(processing);
    detailedComponents.push({
      key: `sandblast-${processing.sandblastFinish}`,
      label: finish.label,
      seedKey: finish.materialSeedKey,
      quantity: area > 0 ? area : 0,
      unit: "m²",
      group: "sandblast",
      note: "Tarif admin-configurabil — neconfirmat în catalog.",
      required: true,
    });
    if (!finish.materialSeedKey) {
      blockers.push(`${finish.label}: Preț neconfigurat (tarif admin)`);
    }
    if (area <= 0) {
      blockers.push(`${finish.label}: aria / benzile trebuie definite.`);
    }
  }

  // --- Facets ---
  if (processing.facetEnabled) {
    const tariffKey =
      `${processing.facetShape}-${processing.facetWidthMm}` as const;
    const seedKey = FACET_TARIFF_SEED[tariffKey];
    const shapeLabel =
      FACET_SHAPES.find((item) => item.id === processing.facetShape)?.label ??
      processing.facetShape;
    detailedComponents.push({
      key: `facet-${tariffKey}`,
      label: `Fațetă ${shapeLabel} ${processing.facetWidthMm} mm`,
      seedKey,
      quantity: processing.facetLengthM,
      unit: "metru",
      group: "facet",
      note: "Tarif pe lungime prelucrată — nu se presupune același tarif pentru toate lățimile.",
      required: true,
    });
    if (!seedKey) {
      blockers.push(
        `Fațetă ${shapeLabel} ${processing.facetWidthMm} mm: tarif lipsă`,
      );
    }
    if (processing.facetLengthM <= 0) {
      blockers.push("Fațetă: lungimea prelucrată (m) trebuie să fie > 0.");
    }
  }

  // --- Engraving ---
  if (processing.engravingEnabled) {
    if (processing.engravingUnitCost === null) {
      blockers.push("Gravură: cost admin neconfigurat");
      detailedComponents.push({
        key: "engraving",
        label: `Gravură${processing.engravingDescription ? `: ${processing.engravingDescription}` : ""}`,
        seedKey: null,
        quantity: processing.engravingQty,
        unit: "bucată",
        group: "engraving",
        required: true,
      });
    } else if (processing.engravingQty > 0) {
      // Explicit admin unit cost — synthetic line via null seed + we'll handle
      // as blocker-free by using a special approach: pass quantity and encode
      // cost through a note; engine needs seedKey. Use "other" with a virtual
      // approach: inject as detailed line only works with catalog.
      // Instead encode via labor-like path: keep as required incomplete unless
      // we add optional unitPrice override. For Stage 5.3, store admin cost by
      // creating a pseudo material isn't allowed. Use group engraving with
      // seedKey null AND include unitCost in a parallel field...
      // Simplest correct approach: add optional unitPriceOverride on DetailedComponentLine.
      detailedComponents.push({
        key: "engraving",
        label: `Gravură${processing.engravingDescription ? `: ${processing.engravingDescription}` : ""}`,
        seedKey: null,
        quantity: processing.engravingQty,
        unit: "bucată",
        group: "engraving",
        note: `Cost admin: ${processing.engravingUnitCost} MDL / buc`,
        required: true,
        unitPriceOverride: processing.engravingUnitCost,
      });
    }
  }

  // --- Defog ---
  if (processing.defogEnabled) {
    const sizeLabel =
      DEFOG_SIZES.find((item) => item.id === processing.defogSize)?.label ??
      processing.defogSize;
    detailedComponents.push({
      key: `defog-film-${processing.defogSize}`,
      label: `Folie dezaburire ${sizeLabel}`,
      seedKey: null,
      quantity: processing.defogQty,
      unit: "bucată",
      group: "defog",
      note: "Preț folie neconfirmat — asociere catalog necesară.",
      required: true,
    });
    blockers.push(
      `Dezaburire ${sizeLabel}: Preț neconfigurat (folie în catalog)`,
    );

    if (processing.defogControl === "touch" && processing.defogQty > 0) {
      detailedComponents.push({
        key: "defog-touch",
        label: "Senzor touch dezaburire (separat de LED)",
        seedKey: MATERIAL_SEED_KEYS.touch,
        quantity: processing.defogQty,
        unit: "bucată",
        group: "defog",
        note: "Nu se confundă cu senzorul LED; se taxează separat.",
        required: true,
      });
    }
    // Mechanical control: selection saved only — no invented price.
  }

  // --- Frames ---
  if (processing.frameType !== "none") {
    const frame = FRAME_TYPES.find((item) => item.id === processing.frameType)!;
    let qty = processing.frameConsumptionQty;
    let note =
      "Consum explicit — fără cost inventat. Asociați material + regulă în admin.";

    if (
      frame.rectangularPerimeterAuto &&
      shapeIsRectangular &&
      frame.materialSeedKey
    ) {
      // Only when admin has confirmed both association and auto rule.
      qty = (2 * (widthMm + heightMm)) / 1000;
      note = "Perimetru auto (regulă admin confirmată).";
    } else if (frame.rectangularPerimeterAuto && !shapeIsRectangular) {
      blockers.push(
        `Ramă ${frame.label}: formă specială — consum explicit sau geometrie validată.`,
      );
    }

    detailedComponents.push({
      key: `frame-${processing.frameType}`,
      label: `Ramă: ${frame.label}`,
      seedKey: frame.materialSeedKey,
      quantity: qty,
      unit: "metru",
      group: "frame",
      note,
      required: true,
    });
    if (!frame.materialSeedKey) {
      blockers.push(`Ramă ${frame.label}: tarif / material lipsă`);
    }
    if (qty <= 0) {
      blockers.push(`Ramă ${frame.label}: consum (cantitate) de confirmat`);
    }
  }

  // --- Mounting ---
  for (const [index, comp] of processing.mountingComponents.entries()) {
    if (comp.qty <= 0) {
      continue;
    }
    detailedComponents.push({
      key: `mounting-${index}`,
      label: `Fixare (${processing.mountingType}): ${comp.label}`,
      seedKey: comp.materialSeedKey,
      quantity: comp.qty,
      unit: "bucată",
      group: "mounting",
      note: "Cantități explicite — fără presupoziții automate de prindere.",
      required: true,
    });
    if (!comp.materialSeedKey) {
      blockers.push(`Fixare „${comp.label}”: Preț neconfigurat`);
    }
  }

  // --- Cutouts ---
  processing.cutouts.forEach((cutout, index) => {
    if (cutout.qty <= 0) {
      return;
    }
    const meta = CUTOUT_TYPES.find((item) => item.id === cutout.type)!;
    const dims: string[] = [];
    if (cutout.diameterMm) {
      dims.push(`Ø ${cutout.diameterMm} mm`);
    }
    if (cutout.widthMm && cutout.heightMm) {
      dims.push(`${cutout.widthMm}×${cutout.heightMm} mm`);
    }
    detailedComponents.push({
      key: `cutout-${index}-${cutout.type}`,
      label: `${meta.label}${dims.length ? ` (${dims.join(", ")})` : ""}`,
      seedKey: meta.materialSeedKey,
      quantity: cutout.qty,
      unit: "bucată",
      group: "cutout",
      required: true,
    });
    if (!meta.materialSeedKey) {
      blockers.push(`${meta.label}: Preț neconfigurat în catalog`);
    }
  });

  // --- Product accessories ---
  for (const acc of processing.accessories) {
    if (!acc.enabled || acc.qty <= 0) {
      continue;
    }
    const meta = PRODUCT_ACCESSORIES.find((item) => item.id === acc.id)!;
    detailedComponents.push({
      key: `accessory-${acc.id}`,
      label: meta.label,
      seedKey: meta.materialSeedKey,
      quantity: acc.qty,
      unit: "bucată",
      group: "product-accessory",
      note: acc.note || undefined,
      required: true,
    });
    if (!meta.materialSeedKey) {
      blockers.push(`${meta.label}: Preț neconfigurat`);
    }
  }

  // --- Branding / protection ---
  for (const brand of processing.branding) {
    if (!brand.enabled) {
      continue;
    }
    const meta = BRANDING_OPTIONS.find((item) => item.id === brand.id)!;
    let qty = brand.qty;
    let unit = "bucată";
    let note: string | undefined;

    if (meta.areaBased) {
      // Anti-shatter: prepare area calc only when material has m² rate.
      // Without association, still incomplete — do not invent.
      if (meta.materialSeedKey && glassAreaM2 != null) {
        qty = glassAreaM2;
        unit = "m²";
        note = "Cantitate = aria oglinzii (doar dacă materialul are tarif m²).";
      } else {
        qty = brand.qty;
        note =
          "Folie anti-ciobire: asociere material m² necesară pentru calcul pe aria oglinzii.";
      }
    }

    detailedComponents.push({
      key: `branding-${brand.id}`,
      label: meta.label,
      seedKey: meta.materialSeedKey,
      quantity: qty,
      unit,
      group: "branding",
      note,
      required: true,
    });
    if (!meta.materialSeedKey) {
      blockers.push(`${meta.label}: Preț neconfigurat`);
    }
  }

  return { detailedComponents, decorativeSandblastAreaM2, blockers };
}
