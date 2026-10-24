import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { formatSupplementMdl } from "@/modules/catalog/preview/supplement-label";
import { applyRetailSupplements } from "@/modules/catalog/preview/supplements";
import { buildPreviewControls, clearInactiveComponents } from "@/modules/catalog/preview/view";
import { defaultConfiguratorRules, validateCustomerConfig } from "@/modules/catalog/rules";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLedSystem, defaultLightingConfig } from "@/modules/configurator/lighting";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { MATERIAL_SEED_KEYS, type CatalogMaterial, type PricingRules } from "@/modules/pricing/engine";
import { acceptedRetailPrice } from "@/modules/orders/public";

const pricingRules: PricingRules = {
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
    seedKey: MATERIAL_SEED_KEYS.led,
    name: "Bandă LED",
    unitPrice: 40,
    unitOfMeasure: "metru",
    isActive: true,
  },
  {
    seedKey: MATERIAL_SEED_KEYS.touch,
    name: "Senzor touch",
    unitPrice: 100,
    unitOfMeasure: "bucată",
    isActive: true,
  },
];

function modelDefault(): ConfiguratorState {
  const lighting = defaultLightingConfig();
  lighting.lightingType = "front";
  lighting.front = {
    ...defaultLedSystem(),
    positioning: "two_height",
    stripTypeId: "standard-15w",
  };
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 1000,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting,
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

describe("customer option supplements", () => {
  it("formats a retail supplement without inventing decimals", () => {
    assert.equal(formatSupplementMdl(0), "0 mdl");
    assert.equal(formatSupplementMdl(91), "+91 mdl");
    assert.equal(formatSupplementMdl(-10.5), "−10,50 mdl");
  });

  it("prices an allowed switch from the engine and leaves an unpriced choice blank", () => {
    const rules = defaultConfiguratorRules();
    rules.features.switchType = {
      mode: "EDITABLE",
      allowedValues: ["mechanical", "touch"],
    };
    const state = modelDefault();
    const controls = applyRetailSupplements({
      controls: buildPreviewControls(rules, state),
      selection: {},
      modelDefault: state,
      rules,
      materials,
      pricingRules,
    });
    const sw = controls.find((control) => control.id === "switchType");
    assert.ok(sw && sw.kind === "select");
    const touch = sw.options.find((option) => option.id === "touch");
    const mechanical = sw.options.find((option) => option.id === "mechanical");
    assert.ok(touch && mechanical);

    const validated = validateCustomerConfig({
      modelDefault: state,
      rules,
      request: { switchType: "touch" },
    });
    assert.equal(validated.ok, true);
    const withTouch = acceptedRetailPrice(
      quoteConfigurator({
        state: clearInactiveComponents(validated.config),
        materials,
        rules: pricingRules,
      }).calculation,
    );
    const base = acceptedRetailPrice(
      quoteConfigurator({
        state: state,
        materials,
        rules: pricingRules,
      }).calculation,
    );
    assert.ok(withTouch != null && base != null);
    assert.equal(touch.supplementMdl, Math.round((withTouch - base) * 100) / 100);
    assert.ok((touch.supplementMdl ?? 0) > 0);
    assert.equal(mechanical.supplementMdl, null);
    assert.equal(findForbiddenCommercialKey(controls), null);
  });
});
