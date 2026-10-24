import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calculateMirrorPricing } from "@/modules/pricing/engine/calculate";
import { computeGlassArea, resolveCurvedEdgeAddsMm } from "@/modules/pricing/engine/glass";
import { applyMarkup } from "@/modules/pricing/engine/money";
import { computeSandblastCost } from "@/modules/pricing/engine/sandblast";
import {
  MATERIAL_SEED_KEYS,
  type CalculationInput,
  type CatalogMaterial,
  type PricingRules,
} from "@/modules/pricing/engine/types";

const defaultRules: PricingRules = {
  wholesaleMarkupPercent: 30,
  retailMarkupPercent: 70,
  curvedEdgeAddMm: 50,
  sandblastMinCharge: 100,
};

const catalog: CatalogMaterial[] = [
  {
    seedKey: MATERIAL_SEED_KEYS.glassRectangle,
    name: "Oglindă standard dreptunghiulară",
    unitPrice: 600,
    unitOfMeasure: "m²",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.glassSpecial,
    name: "Oglindă pentru forme speciale",
    unitPrice: 650,
    unitOfMeasure: "m²",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.led,
    name: "Bandă LED",
    unitPrice: 40,
    unitOfMeasure: "metru",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.transformer,
    name: "Transformator",
    unitPrice: 100,
    unitOfMeasure: "bucată",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.touch,
    name: "Senzor touch",
    unitPrice: 100,
    unitOfMeasure: "bucată",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.sandblast,
    name: "Sablare",
    unitPrice: 600,
    unitOfMeasure: "m²",
    isActive: true,
  },
];

function baseInput(
  overrides: Partial<CalculationInput> = {},
): CalculationInput {
  return {
    widthMm: 600,
    heightMm: 1000,
    shape: "RECTANGLE",
    curvedEdges: { left: false, right: false, top: false, bottom: false },
    components: { ledMeters: 0, transformerPcs: 0, touchPcs: 0 },
    decorativeSandblastAreaM2: 0,
    materials: catalog,
    rules: defaultRules,
    ...overrides,
  };
}

describe("glass area & cost", () => {
  it("rectangle 600×1000 → 360 MDL", () => {
    const area = computeGlassArea({
      widthMm: 600,
      heightMm: 1000,
      shape: "RECTANGLE",
      curvedEdgeAdds: { left: 0, right: 0, top: 0, bottom: 0 },
    });
    assert.equal(area.areaM2, 0.6);
    const result = calculateMirrorPricing(baseInput());
    assert.equal(result.status, "COMPLETE");
    assert.equal(result.glassCost, 360);
    assert.equal(result.totalProductionCost, 360);
    assert.equal(result.wholesalePrice, applyMarkup(360, 30));
    assert.equal(result.retailPrice, applyMarkup(360, 70));
  });

  it("oval 600×1000 all curved sides +50 → 700×1100 = 500.50", () => {
    const adds = resolveCurvedEdgeAddsMm(
      { left: true, right: true, top: true, bottom: true },
      50,
    );
    const area = computeGlassArea({
      widthMm: 600,
      heightMm: 1000,
      shape: "SPECIAL",
      curvedEdgeAdds: adds,
    });
    assert.equal(area.calcWidthMm, 700);
    assert.equal(area.calcHeightMm, 1100);
    assert.equal(area.areaM2, 0.77);

    const result = calculateMirrorPricing(
      baseInput({
        shape: "SPECIAL",
        curvedEdges: { left: true, right: true, top: true, bottom: true },
      }),
    );
    assert.equal(result.glassCost, 500.5);
  });

  it("arcade 600×1000 L/R/top +50, bottom 0 → 700×1050 = 477.75", () => {
    const result = calculateMirrorPricing(
      baseInput({
        shape: "SPECIAL",
        curvedEdges: { left: true, right: true, top: true, bottom: false },
      }),
    );
    assert.equal(result.meta.calcWidthMm, 700);
    assert.equal(result.meta.calcHeightMm, 1050);
    assert.equal(result.glassCost, 477.75);
  });
});

describe("sandblast", () => {
  it("applies minimum and rate correctly", () => {
    assert.equal(computeSandblastCost(0.06, 600, 100), 100);
    assert.equal(computeSandblastCost(0.1, 600, 100), 100);
    assert.equal(computeSandblastCost(0.2, 600, 100), 120);
    assert.equal(computeSandblastCost(0.5, 600, 100), 300);
  });

  it("wires decorative sandblast into calculation once per operation", () => {
    const result = calculateMirrorPricing(
      baseInput({ decorativeSandblastAreaM2: 0.2 }),
    );
    assert.equal(result.operationCosts, 120);
    assert.equal(result.totalProductionCost, 360 + 120);
  });
});

describe("components", () => {
  it("prices explicit LED / transformer / touch quantities", () => {
    const result = calculateMirrorPricing(
      baseInput({
        components: { ledMeters: 2.5, transformerPcs: 1, touchPcs: 2 },
      }),
    );
    assert.equal(result.componentCosts, 2.5 * 40 + 100 + 200);
    const touchLine = result.lines.find(
      (line) => line.key === MATERIAL_SEED_KEYS.touch,
    );
    assert.ok(touchLine?.note?.includes("simbolului"));
    assert.equal(result.electrical?.frontLed, 100);
    assert.equal(result.electrical?.transformers, 100);
    assert.equal(result.electrical?.switches, 200);
  });

  it("does not invent component lines when qty is 0", () => {
    const result = calculateMirrorPricing(baseInput());
    assert.equal(
      result.lines.some((line) => line.key === MATERIAL_SEED_KEYS.led),
      false,
    );
    assert.equal(result.electrical?.total, 0);
  });

  it("prices detailed front/back LED lines independently", () => {
    const result = calculateMirrorPricing(
      baseInput({
        components: { ledMeters: 0, transformerPcs: 0, touchPcs: 0 },
        detailedComponents: [
          {
            key: "led-front",
            label: "Bandă LED față",
            seedKey: MATERIAL_SEED_KEYS.led,
            quantity: 2.2,
            unit: "metru",
            group: "led-front",
            required: true,
          },
          {
            key: "led-back",
            label: "Bandă LED spate",
            seedKey: MATERIAL_SEED_KEYS.led,
            quantity: 1.32,
            unit: "metru",
            group: "led-back",
            required: true,
          },
        ],
      }),
    );
    assert.equal(result.electrical?.frontLed, 88);
    assert.equal(result.electrical?.backLed, 52.8);
    assert.equal(result.electrical?.total, 140.8);
  });

  it("marks unpriced required detailed component incomplete", () => {
    const result = calculateMirrorPricing(
      baseInput({
        detailedComponents: [
          {
            key: "mounting-profile",
            label: "Profil de montaj",
            seedKey: null,
            quantity: 1,
            unit: "bucată",
            group: "accessory",
            required: true,
          },
        ],
      }),
    );
    assert.equal(result.status, "INCOMPLETE");
    assert.ok(
      result.missingCosts.some((item) =>
        item.includes("Preț neconfigurat"),
      ),
    );
  });
});

describe("incomplete calculations", () => {
  it("never treats null material price as 0", () => {
    const materials = catalog.map((material) =>
      material.seedKey === MATERIAL_SEED_KEYS.glassRectangle
        ? { ...material, unitPrice: null }
        : material,
    );
    const result = calculateMirrorPricing(baseInput({ materials }));
    assert.equal(result.status, "INCOMPLETE");
    assert.equal(result.glassCost, null);
    assert.equal(result.totalProductionCost, null);
    assert.equal(result.wholesalePrice, null);
    assert.ok(
      result.missingCosts.some((item) => item.includes("preț nesetat")),
    );
  });

  it("blocks components with unconfirmed UOM", () => {
    const materials = catalog.map((material) =>
      material.seedKey === MATERIAL_SEED_KEYS.led
        ? { ...material, unitOfMeasure: "neconfirmat" }
        : material,
    );
    const result = calculateMirrorPricing(
      baseInput({
        materials,
        components: { ledMeters: 1, transformerPcs: 0, touchPcs: 0 },
      }),
    );
    assert.equal(result.status, "INCOMPLETE");
    assert.ok(
      result.missingCosts.some((item) =>
        item.includes("unitate de măsură neconfirmată"),
      ),
    );
  });

  it("rejects zero / negative / invalid dimensions and quantities", () => {
    assert.equal(
      calculateMirrorPricing(baseInput({ widthMm: 0 })).status,
      "INCOMPLETE",
    );
    assert.equal(
      calculateMirrorPricing(baseInput({ heightMm: -10 })).status,
      "INCOMPLETE",
    );
    assert.equal(
      calculateMirrorPricing(baseInput({ widthMm: Number.NaN })).status,
      "INCOMPLETE",
    );
    assert.equal(
      calculateMirrorPricing(
        baseInput({
          components: { ledMeters: -1, transformerPcs: 0, touchPcs: 0 },
        }),
      ).status,
      "INCOMPLETE",
    );
  });
});

describe("markups", () => {
  it("applies cost markups only to production cost, not services", () => {
    const result = calculateMirrorPricing(
      baseInput({ serviceCosts: 80 }),
    );
    assert.equal(result.totalProductionCost, 360);
    assert.equal(result.wholesalePrice, applyMarkup(360, 30));
    assert.equal(result.retailPrice, applyMarkup(360, 70));
    assert.equal(result.serviceCosts, 80);
    assert.equal(
      result.lines.some((line) => line.kind === "SERVICE"),
      true,
    );
  });
});
