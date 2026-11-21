import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  EXTRA_COMPONENTS,
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
});
