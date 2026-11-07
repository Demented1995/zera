import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildProcessingDetailedComponents,
  computeSandblastBandsAreaM2,
  defaultProcessingConfig,
} from "@/modules/configurator/processing";
import { UNPRICED_SEED } from "@/modules/materials/unpriced-catalog";
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
  it("routes standard sandblast through the mirror area", () => {
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
    assert.equal(built.decorativeSandblastAreaM2, 0.6);
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
    const film = built.detailedComponents.find((line) => line.key === "defog-film");
    const touch = built.detailedComponents.find(
      (line) => line.key === "defog-touch",
    );
    assert.equal(film?.seedKey, UNPRICED_SEED.defog);
    assert.equal(film?.label, "Dezaburire");
    assert.equal(touch?.seedKey, MATERIAL_SEED_KEYS.touch);
    assert.equal(touch?.quantity, 1);
    assert.equal(
      built.detailedComponents.some((line) => line.label.includes("300")),
      false,
    );
  });

  it("defog motion uses the motion sensor and not a film size", () => {
    const processing = defaultProcessingConfig();
    processing.defogEnabled = true;
    processing.defogControl = "motion";
    const built = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: true,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: 0.6,
    });
    const motion = built.detailedComponents.find(
      (line) => line.key === "defog-motion",
    );
    assert.equal(motion?.seedKey, UNPRICED_SEED.switchMotion);
    assert.equal(motion?.label, "Senzor de mișcare dezaburire");
  });

  it("uses the rectangular perimeter when frame consumption is empty", () => {
    const processing = defaultProcessingConfig();
    processing.frameType = "aluminium-special";
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
    assert.equal(frame?.quantity, 3.2);
    assert.equal(
      built.blockers.some((item) => item.includes("consum")),
      false,
    );
  });

  it("writes the round frame length as diameter × 3.14", () => {
    const processing = defaultProcessingConfig();
    processing.frameType = "aluminium-special";
    processing.frameConsumptionQty = 0;
    const built = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: false,
      shapeId: "round",
      widthMm: 500,
      heightMm: 500,
      glassAreaM2: null,
    });
    const frame = built.detailedComponents.find((line) =>
      line.key.startsWith("frame-"),
    );
    assert.equal(frame?.quantity, 1.57);
    assert.equal(frame?.note, "Lungime = diametru × 3,14.");
    assert.equal(
      built.blockers.some((item) => item.includes("metri")),
      false,
    );
  });

  it("keeps an explicit frame consumption and asks for meters on a special shape", () => {
    const processing = defaultProcessingConfig();
    processing.frameType = "aluminium-special";
    processing.frameConsumptionQty = 2.5;
    const explicit = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: false,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: null,
    });
    assert.equal(
      explicit.detailedComponents.find((line) => line.key.startsWith("frame-"))
        ?.quantity,
      2.5,
    );

    processing.frameConsumptionQty = 0;
    const missing = buildProcessingDetailedComponents({
      processing,
      shapeIsRectangular: false,
      widthMm: 600,
      heightMm: 1000,
      glassAreaM2: null,
    });
    assert.ok(missing.blockers.some((item) => item.includes("metri")));
  });
});
