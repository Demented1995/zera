import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EXTRA_COMPONENTS,
  buildLightingDetailedComponents,
  defaultLightingConfig,
  withLedTechnicalExtras,
} from "@/modules/configurator/lighting";

describe("LED technical extras", () => {
  it("checks the transformer and every supplementary component", () => {
    const next = withLedTechnicalExtras(defaultLightingConfig());

    assert.equal(next.transformerPcs, 1);
    assert.equal(next.extraComponents.length, EXTRA_COMPONENTS.length);
    assert.ok(next.extraComponents.every((item) => item.enabled && item.qty >= 1));
  });

  it("keeps a transformer count that is already above one", () => {
    const lighting = defaultLightingConfig();
    lighting.transformerPcs = 2;
    assert.equal(withLedTechnicalExtras(lighting).transformerPcs, 2);
  });

  it("bills plastic frame and ABS on the arcade perimeter, without the LED reserve", () => {
    const lighting = withLedTechnicalExtras(defaultLightingConfig());
    lighting.lightingType = "back";
    const built = buildLightingDetailedComponents({
      lighting,
      shapeIsRectangular: false,
      shapeId: "arcade",
      widthMm: 600,
      heightMm: 1000,
    });
    const plastic = built.detailedComponents.find((line) => line.key.includes("plastic-frame"));
    const abs = built.detailedComponents.find((line) => line.key.includes("abs"));
    const led = built.detailedComponents.find((line) => line.key === "led-back");

    assert.equal(plastic?.quantity, 3.2);
    assert.equal(plastic?.unit, "metru");
    assert.equal(plastic?.note, "Lungime = perimetrul oglinzii.");
    assert.equal(abs?.quantity, 3.2);
    assert.equal(abs?.unit, "metru");
    assert.equal(led?.quantity, 3.52);
  });
});
