import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultCommercialConfig,
  type CommercialConfig,
} from "@/modules/configurator/commercial";
import {
  defaultLedSystem,
  defaultLightingConfig,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import {
  defaultProcessingConfig,
  type ProcessingConfig,
} from "@/modules/configurator/processing";
import { UNPRICED_SEED } from "@/modules/materials/unpriced-catalog";
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

function state(
  overrides: Partial<{
    shapeId: string;
    widthMm: number;
    heightMm: number;
    glassTypeId: string;
    lighting: LightingConfig;
    processing: ProcessingConfig;
    commercial: CommercialConfig;
  }> = {},
) {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 1000,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
    ...overrides,
  };
}

describe("configurator Stage 5.1 glass quotes", () => {
  it("rectangular 600×1000 Standard → glass 360", () => {
    const quote = quoteConfigurator({ state: state(), materials, rules });
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.totalProductionCost, 360);
  });

  it("ellipse oval 600×1000 → 500.50", () => {
    const quote = quoteConfigurator({
      state: state({ shapeId: "ellipse" }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 500.5);
  });

  it("arcade 600×1000 → 477.75", () => {
    const quote = quoteConfigurator({
      state: state({ shapeId: "arcade" }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 477.75);
  });

  it("custom 600×1000 adds 5 cm on every side", () => {
    const quote = quoteConfigurator({
      state: state({
        shapeId: "custom",
        manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
      }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.meta.calcWidthMm, 700);
    assert.equal(quote.calculation?.meta.calcHeightMm, 1100);
    assert.equal(quote.calculation?.glassCost, 500.5);
  });

  it("round 600×1000 uses 650/m² and +50 mm on every side", () => {
    const quote = quoteConfigurator({
      state: state({ shapeId: "round" }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.meta.calcWidthMm, 700);
    assert.equal(quote.calculation?.meta.calcHeightMm, 1100);
    assert.equal(quote.calculation?.glassCost, 500.5);
  });

  it("capsule adds 5 cm only on the two semicircular ends", () => {
    const portrait = quoteConfigurator({
      state: state({ shapeId: "capsule", widthMm: 600, heightMm: 1000 }),
      materials,
      rules,
    });
    assert.equal(portrait.calculation?.meta.calcWidthMm, 600);
    assert.equal(portrait.calculation?.meta.calcHeightMm, 1100);
    assert.equal(portrait.calculation?.glassCost, 429);

    const landscape = quoteConfigurator({
      state: state({ shapeId: "capsule", widthMm: 1000, heightMm: 600 }),
      materials,
      rules,
    });
    assert.equal(landscape.calculation?.meta.calcWidthMm, 1100);
    assert.equal(landscape.calculation?.meta.calcHeightMm, 600);
    assert.equal(landscape.calculation?.glassCost, 429);
  });

  it("semicircle matches the arcade adds; sail adds top and right", () => {
    const semicircle = quoteConfigurator({
      state: state({ shapeId: "semicircle" }),
      materials,
      rules,
    });
    assert.equal(semicircle.calculation?.glassCost, 477.75);

    const sail = quoteConfigurator({
      state: state({ shapeId: "sail" }),
      materials,
      rules,
    });
    assert.equal(sail.calculation?.meta.calcWidthMm, 650);
    assert.equal(sail.calculation?.meta.calcHeightMm, 1050);
    assert.equal(sail.calculation?.glassCost, 443.63);
  });

  it("non-standard glass does not fall back to Standard rates", () => {
    const quote = quoteConfigurator({
      state: state({ glassTypeId: "bronz" }),
      materials,
      rules,
    });
    assert.ok(quote.blockers.some((item) => item.includes("Preț neconfigurat")));
    assert.equal(quote.calculation?.glassCost, null);
    assert.equal(quote.calculation?.status, "INCOMPLETE");
  });

  it("customer quote keeps the Standard glass rate until the type has a tariff", () => {
    const quote = quoteConfigurator({
      state: state({ glassTypeId: "bronz" }),
      materials,
      rules,
      zeroUnsetSwitchPrice: true,
    });
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.glassCost, 360);
  });

  it("customer quote adds 0 for defog without a film price", () => {
    const processing = defaultProcessingConfig();
    processing.defogEnabled = true;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
      zeroUnsetSwitchPrice: true,
    });
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.processing?.defog, 0);
    assert.equal(quote.calculation?.glassCost, 360);
  });

  it("prices non-standard glass from its own catalog material", () => {
    const quote = quoteConfigurator({
      state: state({ glassTypeId: "bronz" }),
      materials: [
        ...materials,
        {
          seedKey: UNPRICED_SEED.glassBronz,
          name: "Sticlă Bronz",
          unitPrice: 700,
          unitOfMeasure: "m²",
          isActive: true,
        },
      ],
      rules,
    });
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.glassCost, 420);
  });
});

describe("configurator Stage 5.2 lighting", () => {
  it("no LED keeps glass-only complete quote", () => {
    const quote = quoteConfigurator({ state: state(), materials, rules });
    assert.equal(quote.lighting.lightingType, "none");
    assert.equal(quote.calculation?.componentCosts, 0);
    assert.equal(quote.calculation?.electrical?.total, 0);
  });

  it("front LED two vertical → 2.2 m / 88 MDL; glass still 360", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front = {
      ...defaultLedSystem(),
      positioning: "two_height",
      stripTypeId: "standard-15w",
    };
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.ledSystems[0]?.length?.totalLengthM, 2.2);
    assert.equal(quote.calculation?.electrical?.frontLed, 88);
    assert.equal(quote.calculation?.electrical?.backLed, 0);
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.totalProductionCost, 360 + 88);
  });

  it("back LED two horizontal → 1.32 m / 52.80", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "back";
    lighting.back = {
      ...defaultLedSystem(),
      positioning: "two_width",
      stripTypeId: "standard-15w",
    };
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.electrical?.backLed, 52.8);
    assert.equal(quote.calculation?.electrical?.frontLed, 0);
  });

  it("perimeter front LED → 3.52 m / 140.80", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "perimeter";
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.ledSystems[0]?.length?.totalLengthM, 3.52);
    assert.equal(quote.calculation?.electrical?.frontLed, 140.8);
  });

  it("both systems are independent", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "both";
    lighting.front.positioning = "two_height";
    lighting.back.positioning = "two_width";
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.ledSystems.length, 2);
    assert.equal(quote.calculation?.electrical?.frontLed, 88);
    assert.equal(quote.calculation?.electrical?.backLed, 52.8);
    assert.equal(quote.calculation?.electrical?.total, 88 + 52.8);
  });

  it("transformer 1 = 100; touch 1 = 100 without extra sandblast", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "two_height";
    lighting.transformerPcs = 1;
    lighting.switches = [
      { type: "touch", qty: 1, associatedSystem: "front" },
    ];
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.electrical?.transformers, 100);
    assert.equal(quote.calculation?.electrical?.switches, 100);
    assert.equal(quote.calculation?.operationCosts, 0);
    const touchLine = quote.calculation?.lines.find((line) =>
      line.label.toLowerCase().includes("touch"),
    );
    assert.ok(touchLine?.note?.toLowerCase().includes("simbol"));
    assert.equal(
      quote.calculation?.lines.some((line) => line.kind === "OPERATION"),
      false,
    );
  });

  it("manual LED path 2.5 m @ 40 = 100", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front = {
      ...defaultLedSystem(),
      manualBaseLengthMm: 2500 / 1.1,
    };
    const quote = quoteConfigurator({
      state: state({ shapeId: "ellipse", lighting }),
      materials,
      rules,
    });
    const totalM = quote.ledSystems[0]?.length?.totalLengthM;
    assert.ok(totalM !== undefined);
    assert.equal(Math.round(totalM! * 100) / 100, Math.round((2500 / 1.1 / 1000) * 1.1 * 100) / 100);
    assert.equal(quote.calculation?.electrical?.frontLed, 100);
  });

  it("missing LED strip type price → INCOMPLETE", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.stripTypeId = "cob-10w";
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.ok(
      quote.calculation?.missingCosts.some((item) =>
        item.toLowerCase().includes("cob 10w"),
      ),
    );
    assert.equal(quote.calculation?.wholesalePrice, null);
  });

  it("missing required extra component price → INCOMPLETE", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.extraComponents = lighting.extraComponents.map((item) =>
      item.id === "mounting-profile"
        ? { ...item, enabled: true, qty: 1, side: "front" }
        : item,
    );
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.ok(
      quote.calculation?.missingCosts.some((item) =>
        item.includes("Profil de montaj"),
      ),
    );
  });

  it("invalid / unconfirmed LED length for special shape", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "perimeter";
    const quote = quoteConfigurator({
      state: state({ shapeId: "ellipse", lighting }),
      materials,
      rules,
    });
    assert.ok(
      quote.blockers.some((item) =>
        item.includes("Lungime LED de confirmat"),
      ),
    );
    assert.equal(quote.calculation?.status, "INCOMPLETE");
  });

  it("does not treat config complete just because LED+transformer priced when extras missing", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.transformerPcs = 2;
    lighting.extraComponents = lighting.extraComponents.map((item) =>
      item.id === "connectors"
        ? { ...item, enabled: true, qty: 2, side: "shared" }
        : item,
    );
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.electrical?.transformers, 200);
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.equal(quote.calculation?.retailPrice, null);
  });

  it("10% applied once on special-shape manual entry", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.manualBaseLengthMm = 2000;
    const quote = quoteConfigurator({
      state: state({ shapeId: "ellipse", lighting }),
      materials,
      rules,
    });
    assert.equal(quote.ledSystems[0]?.length?.totalLengthM, 2.2);
    assert.equal(quote.calculation?.electrical?.frontLed, 88);
    // Glass still uses special formula
    assert.equal(quote.calculation?.glassCost, 500.5);
  });
});

describe("configurator Stage 5.3 processing", () => {
  it("standard sandblast uses the mirror area at the catalog rate", () => {
    const processing = defaultProcessingConfig();
    processing.sandblastFinish = "standard";
    processing.sandblastAreaM2 = 0.06;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.meta.sandblastAreaM2, 0.6);
    assert.equal(quote.calculation?.operationCosts, 360);
    assert.equal(quote.calculation?.processing?.sandblast, 360);
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.calculation?.status, "COMPLETE");
  });

  it("touch without decorative sandblast → no sandblast operation", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.switches = [{ type: "touch", qty: 1, associatedSystem: "front" }];
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.operationCosts, 0);
    assert.equal(
      quote.calculation?.lines.some((line) => line.kind === "OPERATION"),
      false,
    );
    assert.equal(quote.calculation?.electrical?.switches, 100);
  });

  it("touch + decorative sandblast are distinct costs", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.switches = [{ type: "touch", qty: 1, associatedSystem: "front" }];
    const processing = defaultProcessingConfig();
    processing.sandblastFinish = "standard";
    processing.sandblastAreaM2 = 0.2;
    const quote = quoteConfigurator({
      state: state({ lighting, processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.electrical?.switches, 100);
    assert.equal(quote.calculation?.operationCosts, 360);
    assert.equal(
      quote.calculation?.totalProductionCost,
      360 + 88 + 100 + 360,
    );
  });

  it("standard sandblast ignores decorative bands and uses the mirror area", () => {
    const processing = defaultProcessingConfig();
    processing.sandblastFinish = "standard";
    processing.sandblastAreaMode = "bands";
    processing.sandblastBands = [
      { count: 1, lengthMm: 200, widthMm: 150 },
      { count: 1, lengthMm: 200, widthMm: 150 },
    ];
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.meta.sandblastAreaM2, 0.6);
    assert.equal(quote.calculation?.operationCosts, 360);
    assert.equal(
      quote.calculation?.lines.filter((line) => line.kind === "OPERATION")
        .length,
      1,
    );
  });

  it("defog without film price → INCOMPLETE", () => {
    const processing = defaultProcessingConfig();
    processing.defogEnabled = true;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.equal(quote.calculation?.wholesalePrice, null);
    assert.ok(
      quote.calculation?.missingCosts.some((item) =>
        item.toLowerCase().includes("dezaburire"),
      ),
    );
  });

  it("frame without tariff → INCOMPLETE", () => {
    const processing = defaultProcessingConfig();
    processing.frameType = "aluminium-rectangular";
    processing.frameConsumptionQty = 3.2;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.ok(
      quote.calculation?.missingCosts.some((item) => item.includes("Ramă")),
    );
  });

  it("facet without tariff → INCOMPLETE", () => {
    const processing = defaultProcessingConfig();
    processing.facetEnabled = true;
    processing.facetLengthM = 2;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.ok(
      quote.calculation?.missingCosts.some((item) => item.includes("Fațetă")),
    );
  });

  it("facet uses the rectangular perimeter", () => {
    const processing = defaultProcessingConfig();
    processing.facetEnabled = true;
    processing.facetLengthM = 2;
    const quote = quoteConfigurator({
      state: state({ processing }),
      materials: [
        ...materials,
        {
          seedKey: UNPRICED_SEED.facetStraight10,
          name: "Fațetă dreaptă 10 mm",
          unitPrice: 50,
          unitOfMeasure: "metru",
          isActive: true,
        },
      ],
      rules,
    });
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.processing?.facets, 160);
  });

  it("an unpriced switch adds 0 on the customer quote", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "perimeter";
    lighting.transformerPcs = 1;
    lighting.switches = [{ type: "mechanical", qty: 1, associatedSystem: "front" }];
    const blocked = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(blocked.calculation?.status, "INCOMPLETE");

    const shown = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
      zeroUnsetSwitchPrice: true,
    });
    assert.equal(shown.calculation?.status, "COMPLETE");
    assert.equal(shown.calculation?.electrical?.switches, 0);
    assert.ok((shown.calculation?.retailPrice ?? 0) > 0);
  });

  it("engraving uses the mirror area and ignores a typed piece cost", () => {
    const processing = defaultProcessingConfig();
    processing.engravingEnabled = true;
    processing.engravingQty = 3;
    processing.engravingUnitCost = 25;
    const missing = quoteConfigurator({
      state: state({ processing }),
      materials,
      rules,
    });
    assert.equal(missing.calculation?.status, "INCOMPLETE");
    assert.ok(
      missing.calculation?.missingCosts.some((item) =>
        item.toLowerCase().includes("gravură"),
      ),
    );

    const priced = quoteConfigurator({
      state: state({ processing }),
      materials: [
        ...materials,
        {
          seedKey: UNPRICED_SEED.engraving,
          name: "Gravură",
          unitPrice: 100,
          unitOfMeasure: "m²",
          isActive: true,
        },
      ],
      rules,
    });
    assert.equal(priced.calculation?.status, "COMPLETE");
    assert.equal(priced.calculation?.processing?.engraving, 60);
  });

  it("preserves Stage 5.1–5.2 glass and LED calcs with processing none", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "two_height";
    const quote = quoteConfigurator({
      state: state({ lighting }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.ledSystems[0]?.length?.totalLengthM, 2.2);
    assert.equal(quote.calculation?.electrical?.frontLed, 88);
    assert.equal(quote.calculation?.status, "COMPLETE");
  });
});

describe("configurator Stage 5.4 commercial", () => {
  it("labor enters sinecost; 30%/70% markups from settings", () => {
    const commercial = defaultCommercialConfig();
    commercial.laborOps = commercial.laborOps.map((op) =>
      op.id === "simple-assembly"
        ? { ...op, enabled: true, qty: 1, tariff: 50 }
        : op,
    );
    const quote = quoteConfigurator({
      state: state({ commercial }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.laborCost, 50);
    assert.equal(quote.calculation?.totalProductionCost, 360 + 50);
    assert.equal(quote.calculation?.wholesalePrice, (360 + 50) * 1.3);
    assert.equal(quote.calculation?.retailPrice, (360 + 50) * 1.7);
    assert.equal(quote.calculation?.financial?.labor, 50);
    assert.equal(quote.calculation?.status, "COMPLETE");
  });

  it("services stay separate without auto markup on delivery/install", () => {
    const commercial = defaultCommercialConfig();
    commercial.deliveryType = "chisinau";
    commercial.deliveryTariff = 80;
    commercial.installType = "mirror";
    commercial.installQty = 1;
    commercial.installTariff = 120;
    const quote = quoteConfigurator({
      state: state({ commercial }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.totalProductionCost, 360);
    assert.equal(quote.calculation?.wholesalePrice, 360 * 1.3);
    assert.equal(quote.calculation?.serviceCosts, 80 + 120);
    assert.equal(quote.calculation?.financial?.services.delivery, 80);
    assert.equal(quote.calculation?.financial?.services.install, 120);
    assert.equal(quote.calculation?.financial?.offerRetail, 360 * 1.7 + 200);
    // Markup not applied to services: offer ≠ retail of (360+200)
    assert.notEqual(
      quote.calculation?.financial?.offerRetail,
      (360 + 200) * 1.7,
    );
  });

  it("config without extra services remains complete", () => {
    const quote = quoteConfigurator({
      state: state(),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "COMPLETE");
    assert.equal(quote.calculation?.financial?.services.total, 0);
    assert.equal(quote.calculation?.financial?.offerRetail, 360 * 1.7);
  });

  it("incomplete when required labor tariff missing", () => {
    const commercial = defaultCommercialConfig();
    commercial.laborOps = commercial.laborOps.map((op) =>
      op.id === "front-led-mount"
        ? { ...op, enabled: true, qty: 2.2, tariff: null }
        : op,
    );
    const quote = quoteConfigurator({
      state: state({ commercial }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.status, "INCOMPLETE");
    assert.equal(quote.calculation?.wholesalePrice, null);
    assert.ok(
      quote.blockers.some((item) => item.includes("tarif admin neconfigurat")),
    );
  });

  it("does not double-charge labor vs LED component", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "two_height";
    const commercial = defaultCommercialConfig();
    commercial.laborOps = commercial.laborOps.map((op) =>
      op.id === "front-led-mount"
        ? { ...op, enabled: true, qty: 2.2, tariff: 10 }
        : op,
    );
    const quote = quoteConfigurator({
      state: state({ lighting, commercial }),
      materials,
      rules,
    });
    // LED material 88 + labor mount 22 — distinct lines
    assert.equal(quote.calculation?.electrical?.frontLed, 88);
    assert.equal(quote.calculation?.laborCost, 22);
    assert.equal(quote.calculation?.totalProductionCost, 360 + 88 + 22);
  });

  it("included packaging in sinecost; extra packaging as service", () => {
    const included = defaultCommercialConfig();
    included.packagingType = "standard";
    included.packagingRole = "included";
    included.packagingQty = 1;
    included.packagingTariff = 25;
    const quoteIn = quoteConfigurator({
      state: state({ commercial: included }),
      materials,
      rules,
    });
    assert.equal(quoteIn.calculation?.packagingIncludedCost, 25);
    assert.equal(quoteIn.calculation?.totalProductionCost, 360 + 25);
    assert.equal(quoteIn.calculation?.serviceCosts ?? 0, 0);

    const extra = defaultCommercialConfig();
    extra.packagingType = "wood-osb";
    extra.packagingRole = "extra";
    extra.packagingQty = 1;
    extra.packagingTariff = 40;
    const quoteEx = quoteConfigurator({
      state: state({ commercial: extra }),
      materials,
      rules,
    });
    assert.equal(quoteEx.calculation?.totalProductionCost, 360);
    assert.equal(quoteEx.calculation?.financial?.services.packagingExtra, 40);
  });

  it("compatibility with Stage 5.1–5.3 glass/LED/sandblast", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "perimeter";
    const processing = defaultProcessingConfig();
    processing.sandblastFinish = "standard";
    processing.sandblastAreaM2 = 0.2;
    const commercial = defaultCommercialConfig();
    commercial.deliveryType = "chisinau";
    commercial.deliveryTariff = 50;
    const quote = quoteConfigurator({
      state: state({ lighting, processing, commercial }),
      materials,
      rules,
    });
    assert.equal(quote.calculation?.glassCost, 360);
    assert.equal(quote.ledSystems[0]?.length?.totalLengthM, 3.52);
    assert.equal(quote.calculation?.electrical?.frontLed, 140.8);
    assert.equal(quote.calculation?.operationCosts, 360);
    assert.equal(
      quote.calculation?.totalProductionCost,
      360 + 140.8 + 360,
    );
    assert.equal(quote.calculation?.financial?.services.delivery, 50);
    assert.equal(quote.calculation?.status, "COMPLETE");
  });
});
