import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import {
  MATERIAL_SEED_KEYS,
  type CatalogMaterial,
  type PricingRules,
} from "@/modules/pricing/engine";

const rules: PricingRules = {
  wholesaleMarkupPercent: 30,
  retailMarkupPercent: 70,
  curvedEdgeAddMm: 50,
  sandblastMinCharge: 100,
};

const materials: CatalogMaterial[] = [
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
];

describe("configurator Stage 5.1 quotes", () => {
  it("rectangular 600×1000 Standard → glass 360", () => {
    const quote = quoteConfigurator({
      state: {
        shapeId: "rectangular",
        widthMm: 600,
        heightMm: 1000,
        glassTypeId: "standard",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      },
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.totalProductionCost, 360);
  });

  it("ellipse oval 600×1000 → 500.50", () => {
    const quote = quoteConfigurator({
      state: {
        shapeId: "ellipse",
        widthMm: 600,
        heightMm: 1000,
        glassTypeId: "standard",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      },
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 500.5);
  });

  it("arcade 600×1000 → 477.75", () => {
    const quote = quoteConfigurator({
      state: {
        shapeId: "arcade",
        widthMm: 600,
        heightMm: 1000,
        glassTypeId: "standard",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      },
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 477.75);
  });

  it("unconfirmed shape stays incomplete without inventing geometry", () => {
    const quote = quoteConfigurator({
      state: {
        shapeId: "sail",
        widthMm: 600,
        heightMm: 1000,
        glassTypeId: "standard",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      },
      materials,
      rules,
    });
    assert.equal(quote.calculation, null);
    assert.ok(quote.blockers.some((item) => item.includes("nu este încă confirmată")));
  });

  it("non-standard glass does not fall back to Standard rates", () => {
    const quote = quoteConfigurator({
      state: {
        shapeId: "rectangular",
        widthMm: 600,
        heightMm: 1000,
        glassTypeId: "bronz",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      },
      materials,
      rules,
    });
    assert.ok(quote.blockers.some((item) => item.includes("Preț neconfigurat")));
    assert.equal(quote.calculation?.glassCost, null);
    assert.equal(quote.calculation?.status, "INCOMPLETE");
  });
});
