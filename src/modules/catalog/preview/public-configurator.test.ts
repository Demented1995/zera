import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildPreviewControls } from "@/modules/catalog/preview/view";
import { defaultConfiguratorRules, validateCustomerConfig } from "@/modules/catalog/rules";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { UNPRICED_SEED } from "@/modules/materials/unpriced-catalog";
import { defaultLedSystem, defaultLightingConfig } from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";

function state(lighting = defaultLightingConfig()): ConfiguratorState {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting,
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

function backLedState(): ConfiguratorState {
  const lighting = defaultLightingConfig();
  lighting.lightingType = "back";
  lighting.back = { ...defaultLedSystem(), temperatureK: 4000 };
  return state(lighting);
}

describe("public configurator", () => {
  it("offers customer choices and hides internal LED parameters", () => {
    const rules = defaultConfiguratorRules();
    rules.dimensions.width = { mode: "EDITABLE", minMm: 400, maxMm: 1200, stepMm: 10 };
    rules.dimensions.height = { mode: "EDITABLE", minMm: 400, maxMm: 1200, stepMm: 10 };
    rules.features.width = { mode: "EDITABLE", allowedValues: [] };
    rules.features.height = { mode: "EDITABLE", allowedValues: [] };
    rules.features.glassType = {
      mode: "EDITABLE",
      allowedValues: ["standard", "diamant"],
    };
    rules.features.backLed = { mode: "EDITABLE", allowedValues: ["enabled"] };
    rules.features.lightTemp = {
      mode: "EDITABLE",
      allowedValues: ["3000", "4000", "6000"],
    };
    rules.features.switchType = {
      mode: "EDITABLE",
      allowedValues: ["touch", "motion"],
    };
    rules.features.defog = { mode: "EDITABLE", allowedValues: ["enabled"] };
    rules.features.ledPosition = {
      mode: "EDITABLE",
      allowedValues: ["perimeter", "two_height"],
    };
    rules.features.ledStripType = {
      mode: "EDITABLE",
      allowedValues: ["standard-15w"],
    };

    const controls = buildPreviewControls(rules, backLedState());
    const labels = controls.map((control) => control.label);
    const serialized = JSON.stringify(controls);

    assert.ok(labels.includes("Înălțime"));
    assert.ok(labels.includes("Lățime"));
    assert.ok(labels.includes("Tip sticlă"));
    assert.ok(labels.includes("Iluminare LED spate"));
    assert.ok(labels.includes("Culoare LED"));
    assert.ok(labels.includes("Întrerupător"));
    assert.equal(labels.includes("Difuzor de iluminare"), false);
    assert.ok(labels.includes("Încălzire / dezaburire"));
    assert.ok(labels.includes("Livrare"));
    assert.ok(labels.includes("Montare"));
    assert.equal(serialized.includes("Poziție LED"), false);
    assert.equal(serialized.includes("Bandă LED"), false);
    assert.equal(serialized.includes("15W"), false);
    assert.equal(labels.includes("LED față"), false);

    const color = controls.find((control) => control.id === "light-temp");
    assert.ok(color && color.kind === "select");
    assert.deepEqual(
      color.options.map((option) => option.id),
      ["3000", "4000", "6000"],
    );
    const sw = controls.find((control) => control.id === "switchType");
    assert.ok(sw && sw.kind === "select");
    assert.equal(sw.options[0]?.label, "Fără");
    assert.equal(
      sw.options.find((option) => option.id === "motion")?.label,
      "Detector de mișcare",
    );

    const heated = backLedState();
    heated.processing = {
      ...heated.processing,
      defogEnabled: true,
    };
    const heatedControls = buildPreviewControls(rules, heated);
    const defogControl = heatedControls.find(
      (control) => control.id === "defog-control",
    );
    assert.ok(defogControl && defogControl.kind === "select");
    assert.deepEqual(
      defogControl.options.map((option) => option.label),
      ["Întrerupător comun", "Touch", "Senzor de mișcare"],
    );
  });

  it("shows the diffuser for back lighting and hides it for front-only lighting", () => {
    const rules = defaultConfiguratorRules();
    const front = defaultLightingConfig();
    front.lightingType = "front";
    front.offerDiffuser = true;
    front.front = { ...defaultLedSystem(), temperatureK: 4000 };
    const frontLabels = buildPreviewControls(rules, state(front)).map(
      (control) => control.label,
    );
    assert.equal(frontLabels.includes("Difuzor de iluminare"), false);

    const both = defaultLightingConfig();
    both.lightingType = "both";
    both.offerDiffuser = true;
    both.front = { ...defaultLedSystem(), temperatureK: 4000 };
    both.back = { ...defaultLedSystem(), temperatureK: 4000 };
    const bothLabels = buildPreviewControls(rules, state(both)).map(
      (control) => control.label,
    );
    assert.ok(bothLabels.includes("Difuzor de iluminare"));

    const hidden = defaultLightingConfig();
    hidden.lightingType = "back";
    hidden.offerDiffuser = false;
    hidden.back = { ...defaultLedSystem(), temperatureK: 4000 };
    const hiddenLabels = buildPreviewControls(rules, state(hidden)).map(
      (control) => control.label,
    );
    assert.equal(hiddenLabels.includes("Difuzor de iluminare"), false);

    const refused = validateCustomerConfig({
      modelDefault: state(hidden),
      rules,
      request: { diffuserEnabled: true },
    });
    assert.equal(
      refused.config.lighting.extraComponents.some(
        (item) => item.id === "plexiglass-diffuser" && item.enabled,
      ),
      false,
    );
  });

  it("clears the switch without inventing a delivery price", () => {
    const rules = defaultConfiguratorRules();
    rules.features.switchType = {
      mode: "EDITABLE",
      allowedValues: ["touch", "motion"],
    };
    const model = backLedState();
    model.lighting.switches = [
      { type: "touch", qty: 1, associatedSystem: "back" },
    ];

    const cleared = validateCustomerConfig({
      modelDefault: model,
      rules,
      request: { switchType: "none" },
    });
    assert.equal(cleared.ok, true);
    assert.equal(cleared.config.lighting.switches.length, 0);
    assert.equal(cleared.config.lighting.back.stripTypeId, "standard-15w");

    const delivery = validateCustomerConfig({
      modelDefault: model,
      rules,
      request: { deliveryEnabled: true },
    });
    assert.equal(delivery.config.commercial.deliveryType, "pickup");
    assert.equal(
      delivery.rejected.some((issue) => issue.code === "unpriced_option"),
      true,
    );
    assert.equal(delivery.config.commercial.deliveryTariff, null);
  });

  it("applies the model's own delivery and installation tariffs", () => {
    const model = state();
    model.commercial = {
      ...defaultCommercialConfig(),
      deliveryType: "chisinau",
      deliveryTariff: 150,
      installType: "mirror",
      installTariff: 500,
      installQty: 1,
    };
    const off = validateCustomerConfig({
      modelDefault: model,
      rules: defaultConfiguratorRules(),
      request: { deliveryEnabled: false, installEnabled: false },
    });
    assert.equal(off.config.commercial.deliveryType, "pickup");
    assert.equal(off.config.commercial.installType, "none");

    const on = validateCustomerConfig({
      modelDefault: model,
      rules: defaultConfiguratorRules(),
      request: { deliveryEnabled: true, installEnabled: true },
    });
    assert.equal(on.config.commercial.deliveryType, "chisinau");
    assert.equal(on.config.commercial.deliveryTariff, 150);
    assert.equal(on.config.commercial.installType, "mirror");
    assert.equal(on.config.commercial.installTariff, 500);
    assert.equal(on.rejected.some((issue) => issue.code === "unpriced_option"), false);
  });

  it("uses a catalog delivery tariff when the model has none", () => {
    const priced = validateCustomerConfig({
      modelDefault: state(),
      rules: defaultConfiguratorRules(),
      request: { deliveryEnabled: true, installEnabled: true },
      materials: [
        {
          seedKey: UNPRICED_SEED.deliveryChisinau,
          name: "Livrare Chișinău",
          unitPrice: 80,
          unitOfMeasure: "serviciu",
          isActive: true,
        },
        {
          seedKey: UNPRICED_SEED.installMirror,
          name: "Montaj oglindă",
          unitPrice: 200,
          unitOfMeasure: "serviciu",
          isActive: true,
        },
      ],
    });
    assert.equal(priced.config.commercial.deliveryType, "chisinau");
    assert.equal(priced.config.commercial.deliveryTariff, 80);
    assert.equal(priced.config.commercial.installType, "mirror");
    assert.equal(priced.config.commercial.installTariff, 200);
    assert.equal(priced.rejected.some((issue) => issue.code === "unpriced_option"), false);
  });

  it("shows 0 for delivery and mounting when no tariff is set", () => {
    const priced = validateCustomerConfig({
      modelDefault: state(),
      rules: defaultConfiguratorRules(),
      request: { deliveryEnabled: true, installEnabled: true },
      customerZerosUnset: true,
    });
    assert.equal(priced.config.commercial.deliveryType, "chisinau");
    assert.equal(priced.config.commercial.deliveryTariff, 0);
    assert.equal(priced.config.commercial.installType, "mirror");
    assert.equal(priced.config.commercial.installTariff, 0);
    assert.equal(priced.rejected.some((issue) => issue.code === "unpriced_option"), false);
  });
});
