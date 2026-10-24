import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyLedLengthSupplement,
  computeRectangularLedBaseMm,
  ledLengthCost,
  resolveLedLength,
} from "@/modules/pricing/engine/led-length";

describe("rectangular LED length formulas (600×1000)", () => {
  it("2 vertical → 2.2 m with 10%, cost 88 at 40 MDL/m", () => {
    const baseMm = computeRectangularLedBaseMm(600, 1000, "two_height");
    assert.equal(baseMm, 2000);
    const length = applyLedLengthSupplement(baseMm);
    assert.equal(length.baseLengthM, 2);
    assert.equal(length.supplementM, 0.2);
    assert.equal(length.totalLengthM, 2.2);
    assert.equal(ledLengthCost(length.totalLengthM, 40), 88);
  });

  it("2 horizontal → 1.32 m with 10%, cost 52.80 at 40 MDL/m", () => {
    const baseMm = computeRectangularLedBaseMm(600, 1000, "two_width");
    assert.equal(baseMm, 1200);
    const length = applyLedLengthSupplement(baseMm);
    assert.equal(length.baseLengthM, 1.2);
    assert.equal(length.supplementM, 0.12);
    assert.equal(length.totalLengthM, 1.32);
    assert.equal(ledLengthCost(length.totalLengthM, 40), 52.8);
  });

  it("perimeter → 3.52 m with 10%, cost 140.80 at 40 MDL/m", () => {
    const baseMm = computeRectangularLedBaseMm(600, 1000, "perimeter");
    assert.equal(baseMm, 3200);
    const length = applyLedLengthSupplement(baseMm);
    assert.equal(length.baseLengthM, 3.2);
    assert.equal(length.supplementM, 0.32);
    assert.equal(length.totalLengthM, 3.52);
    assert.equal(ledLengthCost(length.totalLengthM, 40), 140.8);
  });

  it("1 vertical = height; 1 horizontal = width", () => {
    assert.equal(computeRectangularLedBaseMm(600, 1000, "one_height"), 1000);
    assert.equal(computeRectangularLedBaseMm(600, 1000, "one_width"), 600);
  });
});

describe("special shapes", () => {
  it("does not auto-use bounding-rect perimeter for special shapes", () => {
    const result = resolveLedLength({
      shapeIsRectangular: false,
      widthMm: 600,
      heightMm: 1000,
      positioning: "perimeter",
    });
    assert.ok("error" in result);
    assert.ok(result.error.includes("Lungime LED de confirmat"));
  });

  it("applies 10% once on manual base — never doubles", () => {
    const result = resolveLedLength({
      shapeIsRectangular: false,
      widthMm: 600,
      heightMm: 1000,
      positioning: "perimeter",
      manualBaseLengthMm: 2000,
    });
    assert.ok(!("error" in result));
    assert.equal(result.totalLengthM, 2.2);
    assert.equal(result.source, "manual");
  });

  it("rejects a missing manual length for a non-rectangular shape", () => {
    const result = resolveLedLength({
      shapeIsRectangular: false,
      widthMm: 600,
      heightMm: 1000,
      positioning: "two_height",
      manualBaseLengthMm: 0,
    });
    assert.ok("error" in result);
  });
});

describe("LED 2.5 m at 40 MDL/m", () => {
  it("costs 100 MDL", () => {
    assert.equal(ledLengthCost(2.5, 40), 100);
  });
});
