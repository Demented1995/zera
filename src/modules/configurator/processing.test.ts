import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProcessingDetailedComponents,
  computeSandblastBandsAreaM2,
  defaultProcessingConfig,
} from "@/modules/configurator/processing";
import { MATERIAL_SEED_KEYS } from "@/modules/pricing/engine";

describe("sandblast band area", () => {
  it("sums rectangular bands in m²", () => {
    assert.equal(
      computeSandblastBandsAreaM2([
        { count: 2, lengthMm: 100, widthMm: 100 },
      ]),
      0.02,
    );
  });
});

describe("buildProcessingDetailedComponents", () => {
  it("routes standard sandblast to decorative area only (engine OPERATION)", () => {
    const processing = defaultProcessingConfig();
    processing.sandblastFinish = "standard";
    processing.sandblastAreaM2 = 0.2;
    const built = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: true,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: 0.6,
    });
    assert.equal(built.decorativeSandblastAreaM2, 0.2);
    assert.equal(
      built.detailedComponents.some((line) => line.group === "sandblast"),
      false,
    );
  });

  it("defog touch adds separate touch line using catalog sensor", () => {
    const processing = defaultProcessingConfig();
    processing.defogEnabled = true;
    processing.defogControl = "touch";
    processing.defogQty = 1;
    const built = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: true,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: 0.6,
    });
    const touch = built.detailedComponents.find(
      (line) => line.key === "defog-touch",
    );
    assert.equal(touch?.seedKey, MATERIAL_SEED_KEYS.touch);
    assert.equal(touch?.quantity, 1);
    assert.ok(built.blockers.some((item) => item.includes("Dezaburire")));
  });

  it("does not invent frame perimeter when auto rule is off", () => {
    const processing = defaultProcessingConfig();
    processing.frameType = "aluminium-rectangular";
    processing.frameConsumptionQty = 0;
    const built = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: true,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: 0.6,
    });
    const frame = built.detailedComponents.find((line) =>
      line.key.startsWith("frame-"),
    );
    assert.equal(frame?.quantity, 0);
    assert.ok(built.blockers.some((item) => item.includes("consum")));
  });
});
