import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canonicalConfigurationRequest,
  configurationRequestHash,
} from "@/modules/shop/share";

describe("configuration links", () => {
  it("uses one hash for the same options in a different order", () => {
    const left = canonicalConfigurationRequest({
      widthMm: 700,
      accessoryIds: ["b", "a"],
    });
    const right = canonicalConfigurationRequest({
      accessoryIds: ["a", "b"],
      widthMm: 700,
    });
    assert.ok(left);
    assert.ok(right);
    assert.equal(configurationRequestHash(left), configurationRequestHash(right));
  });

  it("keeps the standard configuration on the model link", () => {
    const request = canonicalConfigurationRequest({});
    assert.ok(request);
    assert.equal(Object.keys(request).length, 0);
  });

  it("rejects a client price", () => {
    assert.equal(canonicalConfigurationRequest({ widthMm: 700, retailPrice: 1 }), null);
  });
});
