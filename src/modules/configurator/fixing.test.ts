import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { defaultConfiguratorRules } from "@/modules/catalog/rules/defaults";
import { validateCustomerConfig } from "@/modules/catalog/rules/validate";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { plugFixingExtraMdl } from "@/modules/configurator/fixing";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";

describe("simple mirror fixing", () => {
  const modelDefault = {
    shapeId: "rectangular",
    widthMm: 500,
    heightMm: 500,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };

  it("keeps the plug extra flat until area billing is switched on", () => {
    assert.equal(plugFixingExtraMdl(0.25), 250);
    assert.equal(plugFixingExtraMdl(3), 250);
  });

  it("accepts dibluri only when the model allows the choice", () => {
    const allowed = validateCustomerConfig({
      modelDefault,
      rules: defaultConfiguratorRules(),
      request: { fixing: "plugs" },
      allowFixing: true,
    });
    const ignored = validateCustomerConfig({
      modelDefault,
      rules: defaultConfiguratorRules(),
      request: { fixing: "plugs" },
    });
    assert.equal(allowed.ok, true);
    assert.equal(allowed.config.processing.fixing, "plugs");
    assert.equal(ignored.config.processing.fixing, "adhesive");
  });
});
