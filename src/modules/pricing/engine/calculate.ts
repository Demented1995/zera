import { computeGlassArea, resolveCurvedEdgeAddsMm } from "@/modules/pricing/engine/glass";
import { applyMarkup, roundMoney } from "@/modules/pricing/engine/money";
import { computeSandblastCost } from "@/modules/pricing/engine/sandblast";
import {
  MATERIAL_SEED_KEYS,
  UNCONFIRMED_UOM,
  type CalculationInput,
  type CalculationResult,
  type CatalogMaterial,
  type CostLine,
  type DetailedComponentLine,
} from "@/modules/pricing/engine/types";

function findMaterial(
  materials: CatalogMaterial[],
  seedKey: string,
): CatalogMaterial | undefined {
  return materials.find((material) => material.seedKey === seedKey);
}

function materialBlockingReason(material: CatalogMaterial | undefined, label: string): string | null {
  if (!material) {
    return `${label}: material lipsă din catalog`;
  }
  if (!material.isActive) {
    return `${label}: material inactiv (${material.name})`;
  }
  if (material.unitPrice === null) {
    return `${label}: preț nesetat (${material.name})`;
  }
  if (material.unitOfMeasure === UNCONFIRMED_UOM) {
    return `${label}: unitate de măsură neconfirmată (${material.name})`;
  }
  return null;
}

function sumNullable(values: Array<number | null>): number | null {
  if (values.some((value) => value === null)) {
    return null;
  }
  return roundMoney(values.reduce<number>((sum, value) => sum + (value as number), 0));
}

function assertValidDimensions(widthMm: number, heightMm: number): string | null {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) {
    return "Dimensiuni invalide";
  }
  if (widthMm <= 0 || heightMm <= 0) {
    return "Dimensiunile trebuie să fie pozitive";
  }
  return null;
}

function assertNonNegativeQty(label: string, qty: number): string | null {
  if (!Number.isFinite(qty) || qty < 0) {
    return `Cantitate invalidă pentru ${label}`;
  }
  return null;
}

/**
 * Pure cost/price calculation engine.
 * Reusable by admin test UI, future configurators, and orders.
 * Never coerces null material prices to 0.
 */
export function calculateMirrorPricing(
  input: CalculationInput,
): CalculationResult {
  const missingCosts: string[] = [];
  const lines: CostLine[] = [];

  const dimError = assertValidDimensions(input.widthMm, input.heightMm);
  if (dimError) {
    return incompleteShell(missingCosts.concat(dimError), lines);
  }

  for (const [label, qty] of [
    ["Bandă LED", input.components.ledMeters],
    ["Transformator", input.components.transformerPcs],
    ["Senzor touch", input.components.touchPcs],
    ["Sablare decorativă", input.decorativeSandblastAreaM2],
  ] as const) {
    const err = assertNonNegativeQty(label, qty);
    if (err) {
      return incompleteShell(missingCosts.concat(err), lines);
    }
  }

  if (input.rules.curvedEdgeAddMm < 0) {
    return incompleteShell(
      missingCosts.concat("Adaosul pentru laturi curbe trebuie să fie ≥ 0"),
      lines,
    );
  }

  // --- Glass ---
  const glassKey =
    input.shape === "RECTANGLE"
      ? MATERIAL_SEED_KEYS.glassRectangle
      : MATERIAL_SEED_KEYS.glassSpecial;
  const glassMaterial = findMaterial(input.materials, glassKey);
  const glassBlock = materialBlockingReason(
    glassMaterial,
    input.shape === "RECTANGLE"
      ? "Sticlă (dreptunghiulară)"
      : "Sticlă (forme speciale)",
  );

  const curvedAdds =
    input.explicitCurvedEdgeAddsMm ??
    resolveCurvedEdgeAddsMm(input.curvedEdges, input.rules.curvedEdgeAddMm);

  if (
    curvedAdds.left < 0 ||
    curvedAdds.right < 0 ||
    curvedAdds.top < 0 ||
    curvedAdds.bottom < 0
  ) {
    return incompleteShell(
      missingCosts.concat("Adaosurile pe laturi trebuie să fie ≥ 0"),
      lines,
    );
  }

  const glassArea = computeGlassArea({
    widthMm: input.widthMm,
    heightMm: input.heightMm,
    shape: input.shape,
    curvedEdgeAdds: curvedAdds,
  });

  let glassCost: number | null = null;
  let glassRate: number | null = null;

  if (glassBlock) {
    missingCosts.push(glassBlock);
    lines.push({
      kind: "GLASS",
      key: glassKey,
      label: glassMaterial?.name ?? "Sticlă",
      quantity: glassArea.areaM2,
      unit: "m²",
      unitPrice: null,
      amount: null,
      incompleteReason: glassBlock,
    });
  } else {
    glassRate = glassMaterial!.unitPrice;
    glassCost = roundMoney(glassArea.areaM2 * glassRate!);
    lines.push({
      kind: "GLASS",
      key: glassKey,
      label: glassMaterial!.name,
      quantity: glassArea.areaM2,
      unit: "m²",
      unitPrice: glassRate,
      amount: glassCost,
      note:
        input.shape === "SPECIAL"
          ? `Zonă calculată ${glassArea.calcWidthMm}×${glassArea.calcHeightMm} mm`
          : undefined,
    });
  }

  // --- Components (explicit qty only) ---
  const componentSpecs: Array<{
    seedKey: string;
    qty: number;
    label: string;
    note?: string;
  }> = [
    {
      seedKey: MATERIAL_SEED_KEYS.led,
      qty: input.components.ledMeters,
      label: "Bandă LED",
    },
    {
      seedKey: MATERIAL_SEED_KEYS.transformer,
      qty: input.components.transformerPcs,
      label: "Transformator",
    },
    {
      seedKey: MATERIAL_SEED_KEYS.touch,
      qty: input.components.touchPcs,
      label: "Senzor touch",
      note: "Include sablarea simbolului; nu se adaugă sablare separată pentru simbol.",
    },
  ];

  const componentAmounts: Array<number | null> = [];
  const electricalBuckets: Record<
    "frontLed" | "backLed" | "switches" | "transformers" | "accessories",
    Array<number | null>
  > = {
    frontLed: [],
    backLed: [],
    switches: [],
    transformers: [],
    accessories: [],
  };
  const processingBuckets: Record<ProcessingBucketKey, Array<number | null>> = {
    sandblast: [],
    facets: [],
    engraving: [],
    defog: [],
    frames: [],
    mounting: [],
    cutouts: [],
    accessories: [],
    branding: [],
  };

  for (const spec of componentSpecs) {
    if (spec.qty === 0) {
      continue;
    }

    const material = findMaterial(input.materials, spec.seedKey);
    const block = materialBlockingReason(material, spec.label);

    if (block) {
      missingCosts.push(block);
      componentAmounts.push(null);
      lines.push({
        kind: "COMPONENT",
        key: spec.seedKey,
        label: material?.name ?? spec.label,
        quantity: spec.qty,
        unit: material?.unitOfMeasure ?? null,
        unitPrice: null,
        amount: null,
        note: spec.note,
        incompleteReason: block,
      });
      continue;
    }

    const amount = roundMoney(spec.qty * material!.unitPrice!);
    componentAmounts.push(amount);
    lines.push({
      kind: "COMPONENT",
      key: spec.seedKey,
      label: material!.name,
      quantity: spec.qty,
      unit: material!.unitOfMeasure,
      unitPrice: material!.unitPrice,
      amount,
      note: spec.note,
    });

    if (spec.seedKey === MATERIAL_SEED_KEYS.led) {
      electricalBuckets.frontLed.push(amount);
    } else if (spec.seedKey === MATERIAL_SEED_KEYS.transformer) {
      electricalBuckets.transformers.push(amount);
    } else if (spec.seedKey === MATERIAL_SEED_KEYS.touch) {
      electricalBuckets.switches.push(amount);
    }
  }

  for (const detail of input.detailedComponents ?? []) {
    if (detail.quantity === 0 && !detail.required) {
      continue;
    }

    if (detail.quantity < 0 || !Number.isFinite(detail.quantity)) {
      missingCosts.push(`${detail.label}: cantitate invalidă`);
      componentAmounts.push(null);
      continue;
    }

    if (!detail.seedKey) {
      const override = detail.unitPriceOverride;
      if (
        override !== null &&
        override !== undefined &&
        Number.isFinite(override) &&
        override >= 0 &&
        detail.quantity > 0
      ) {
        const amount = roundMoney(detail.quantity * override);
        componentAmounts.push(amount);
        lines.push({
          kind: "COMPONENT",
          key: detail.key,
          label: detail.label,
          quantity: detail.quantity,
          unit: detail.unit,
          unitPrice: override,
          amount,
          note: detail.note,
        });
        pushCostBucket(electricalBuckets, processingBuckets, detail.group, amount);
        continue;
      }

      const reason = `${detail.label}: Preț neconfigurat (fără material asociat în catalog)`;
      if (detail.required || detail.quantity > 0) {
        missingCosts.push(reason);
        componentAmounts.push(null);
        lines.push({
          kind: "COMPONENT",
          key: detail.key,
          label: detail.label,
          quantity: detail.quantity,
          unit: detail.unit,
          unitPrice: null,
          amount: null,
          note: detail.note,
          incompleteReason: reason,
        });
        pushCostBucket(electricalBuckets, processingBuckets, detail.group, null);
      }
      continue;
    }

    const material = findMaterial(input.materials, detail.seedKey);
    const block = materialBlockingReason(material, detail.label);

    if (block) {
      missingCosts.push(block);
      componentAmounts.push(null);
      lines.push({
        kind: "COMPONENT",
        key: detail.key,
        label: material?.name ?? detail.label,
        quantity: detail.quantity,
        unit: detail.unit,
        unitPrice: null,
        amount: null,
        note: detail.note,
        incompleteReason: block,
      });
      pushCostBucket(electricalBuckets, processingBuckets, detail.group, null);
      continue;
    }

    if (detail.quantity === 0) {
      if (detail.required) {
        const reason =
          detail.note ?? `${detail.label}: cantitate / lungime de confirmat`;
        missingCosts.push(reason);
        componentAmounts.push(null);
        lines.push({
          kind: "COMPONENT",
          key: detail.key,
          label: material!.name ?? detail.label,
          quantity: 0,
          unit: detail.unit,
          unitPrice: material!.unitPrice,
          amount: null,
          note: detail.note,
          incompleteReason: reason,
        });
        pushCostBucket(electricalBuckets, processingBuckets, detail.group, null);
      }
      continue;
    }

    const amount = roundMoney(detail.quantity * material!.unitPrice!);
    componentAmounts.push(amount);
    lines.push({
      kind: "COMPONENT",
      key: detail.key,
      label: detail.label,
      quantity: detail.quantity,
      unit: detail.unit,
      unitPrice: material!.unitPrice,
      amount,
      note: detail.note,
    });
    pushCostBucket(electricalBuckets, processingBuckets, detail.group, amount);
  }

  const componentCosts =
    componentAmounts.length === 0 ? 0 : sumNullable(componentAmounts);

  const electrical = {
    frontLed: sumBucket(electricalBuckets.frontLed),
    backLed: sumBucket(electricalBuckets.backLed),
    switches: sumBucket(electricalBuckets.switches),
    transformers: sumBucket(electricalBuckets.transformers),
    accessories: sumBucket(electricalBuckets.accessories),
    total: null as number | null,
  };
  electrical.total = sumNullable([
    electrical.frontLed,
    electrical.backLed,
    electrical.switches,
    electrical.transformers,
    electrical.accessories,
  ]);

  // --- Decorative sandblast (separate from touch symbol) ---
  // Minimum applies ONCE per decorative sandblast operation, not per band.
  // Touch-symbol sandblast is already included in the touch sensor price.
  let operationCosts: number | null = 0;
  const sandblastArea =
    input.decorativeSandblastAreaM2 > 0
      ? input.decorativeSandblastAreaM2
      : null;

  if (sandblastArea !== null) {
    const sandblastMaterial = findMaterial(
      input.materials,
      MATERIAL_SEED_KEYS.sandblast,
    );
    const block = materialBlockingReason(sandblastMaterial, "Sablare decorativă");

    if (block) {
      missingCosts.push(block);
      operationCosts = null;
      processingBuckets.sandblast.push(null);
      lines.push({
        kind: "OPERATION",
        key: MATERIAL_SEED_KEYS.sandblast,
        label: sandblastMaterial?.name ?? "Sablare",
        quantity: sandblastArea,
        unit: "m²",
        unitPrice: null,
        amount: null,
        note: "Minim pe operațiune de sablare decorativă (nu pe bandă).",
        incompleteReason: block,
      });
    } else {
      const amount = computeSandblastCost(
        sandblastArea,
        sandblastMaterial!.unitPrice!,
        input.rules.sandblastMinCharge,
      );
      operationCosts = amount;
      processingBuckets.sandblast.push(amount);
      lines.push({
        kind: "OPERATION",
        key: MATERIAL_SEED_KEYS.sandblast,
        label: sandblastMaterial!.name,
        quantity: sandblastArea,
        unit: "m²",
        unitPrice: sandblastMaterial!.unitPrice,
        amount,
        note: `Minim ${roundMoney(input.rules.sandblastMinCharge)} MDL / operațiune`,
      });
    }
  }

  // --- Labor (optional, only if configured) ---
  let laborCost: number | null = null;
  if (input.laborCost === null) {
    // explicitly null = not configured → omit from production total without blocking
    laborCost = null;
  } else if (input.laborCost === undefined) {
    laborCost = null;
  } else if (!Number.isFinite(input.laborCost) || input.laborCost < 0) {
    missingCosts.push("Manoperă: valoare invalidă");
    laborCost = null;
  } else {
    laborCost = roundMoney(input.laborCost);
    lines.push({
      kind: "LABOR",
      key: "labor",
      label: "Manoperă",
      quantity: 1,
      unit: "fixă",
      unitPrice: laborCost,
      amount: laborCost,
    });
  }

  // --- Services (excluded from markups) ---
  let serviceCosts: number | null = null;
  if (
    input.serviceCosts !== undefined &&
    input.serviceCosts !== null &&
    Number.isFinite(input.serviceCosts) &&
    input.serviceCosts >= 0
  ) {
    serviceCosts = roundMoney(input.serviceCosts);
    lines.push({
      kind: "SERVICE",
      key: "services",
      label: "Servicii (livrare/montaj/comerciale)",
      quantity: 1,
      unit: "fixă",
      unitPrice: serviceCosts,
      amount: serviceCosts,
      note: "Nu se aplică adaos en-gros / retail automat.",
    });
  }

  const productionParts: Array<number | null> = [
    glassCost,
    componentCosts,
    operationCosts,
  ];
  if (laborCost !== null) {
    productionParts.push(laborCost);
  }

  const totalProductionCost = sumNullable(productionParts);

  let wholesalePrice: number | null = null;
  let retailPrice: number | null = null;

  if (totalProductionCost !== null) {
    wholesalePrice = applyMarkup(
      totalProductionCost,
      input.rules.wholesaleMarkupPercent,
    );
    retailPrice = applyMarkup(
      totalProductionCost,
      input.rules.retailMarkupPercent,
    );
  } else {
    // Markups cannot be computed without a complete production cost
    if (!missingCosts.some((m) => m.includes("adaos") || m.includes("Cost total"))) {
      // keep missing list focused on material gaps already collected
    }
  }

  const processing = {
    sandblast: sumBucket(processingBuckets.sandblast),
    facets: sumBucket(processingBuckets.facets),
    engraving: sumBucket(processingBuckets.engraving),
    defog: sumBucket(processingBuckets.defog),
    frames: sumBucket(processingBuckets.frames),
    mounting: sumBucket(processingBuckets.mounting),
    cutouts: sumBucket(processingBuckets.cutouts),
    accessories: sumBucket(processingBuckets.accessories),
    branding: sumBucket(processingBuckets.branding),
    total: null as number | null,
  };
  processing.total = sumNullable([
    processing.sandblast,
    processing.facets,
    processing.engraving,
    processing.defog,
    processing.frames,
    processing.mounting,
    processing.cutouts,
    processing.accessories,
    processing.branding,
  ]);

  const status = missingCosts.length === 0 ? "COMPLETE" : "INCOMPLETE";

  return {
    status,
    glassCost,
    componentCosts: componentCosts ?? (componentAmounts.length === 0 ? 0 : null),
    operationCosts,
    laborCost,
    totalProductionCost,
    serviceCosts,
    wholesalePrice,
    retailPrice,
    missingCosts,
    lines,
    electrical,
    processing,
    meta: {
      calcWidthMm: glassArea.calcWidthMm,
      calcHeightMm: glassArea.calcHeightMm,
      glassAreaM2: glassArea.areaM2,
      glassRate,
      sandblastAreaM2: sandblastArea,
    },
  };
}

type ElectricalBucketKey =
  | "frontLed"
  | "backLed"
  | "switches"
  | "transformers"
  | "accessories";

type ProcessingBucketKey =
  | "sandblast"
  | "facets"
  | "engraving"
  | "defog"
  | "frames"
  | "mounting"
  | "cutouts"
  | "accessories"
  | "branding";

function pushCostBucket(
  electrical: Record<ElectricalBucketKey, Array<number | null>>,
  processing: Record<ProcessingBucketKey, Array<number | null>>,
  group: DetailedComponentLine["group"],
  amount: number | null,
): void {
  switch (group) {
    case "led-front":
      electrical.frontLed.push(amount);
      break;
    case "led-back":
      electrical.backLed.push(amount);
      break;
    case "switch":
      electrical.switches.push(amount);
      break;
    case "transformer":
      electrical.transformers.push(amount);
      break;
    case "accessory":
    case "other":
      electrical.accessories.push(amount);
      break;
    case "sandblast":
      processing.sandblast.push(amount);
      break;
    case "facet":
      processing.facets.push(amount);
      break;
    case "engraving":
      processing.engraving.push(amount);
      break;
    case "defog":
      processing.defog.push(amount);
      break;
    case "frame":
      processing.frames.push(amount);
      break;
    case "mounting":
      processing.mounting.push(amount);
      break;
    case "cutout":
      processing.cutouts.push(amount);
      break;
    case "product-accessory":
      processing.accessories.push(amount);
      break;
    case "branding":
      processing.branding.push(amount);
      break;
    default: {
      const _exhaustive: never = group;
      void _exhaustive;
    }
  }
}

function sumBucket(values: Array<number | null>): number | null {
  if (values.length === 0) {
    return 0;
  }
  return sumNullable(values);
}

function incompleteShell(
  missingCosts: string[],
  lines: CostLine[],
): CalculationResult {
  return {
    status: "INCOMPLETE",
    glassCost: null,
    componentCosts: null,
    operationCosts: null,
    laborCost: null,
    totalProductionCost: null,
    serviceCosts: null,
    wholesalePrice: null,
    retailPrice: null,
    missingCosts,
    lines,
    electrical: {
      frontLed: null,
      backLed: null,
      switches: null,
      transformers: null,
      accessories: null,
      total: null,
    },
    processing: {
      sandblast: null,
      facets: null,
      engraving: null,
      defog: null,
      frames: null,
      mounting: null,
      cutouts: null,
      accessories: null,
      branding: null,
      total: null,
    },
    meta: {
      calcWidthMm: null,
      calcHeightMm: null,
      glassAreaM2: null,
      glassRate: null,
      sandblastAreaM2: null,
    },
  };
}
