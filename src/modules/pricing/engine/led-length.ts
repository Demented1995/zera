import { roundMoney } from "@/modules/pricing/engine/money";

/** Joint/connection supplement applied once to the base LED length. */
export const LED_LENGTH_SUPPLEMENT_RATIO = 0.1;

export type LedPositioning =
  | "one_width"
  | "two_width"
  | "one_height"
  | "two_height"
  | "perimeter";

export type LedLengthComputation = {
  /** Base length in mm before the 10% supplement. */
  baseLengthMm: number;
  /** Base length in meters before supplement. */
  baseLengthM: number;
  /** Supplement meters (10% of base). */
  supplementM: number;
  /** Total billable meters after 10%. */
  totalLengthM: number;
  /** How the base length was obtained. */
  source: "auto-rectangular" | "manual" | "unconfirmed";
  note?: string;
};

/**
 * Rectangular-only confirmed auto formulas (dims in mm).
 * Does not invent perimeter for special shapes.
 */
export function computeRectangularLedBaseMm(
  widthMm: number,
  heightMm: number,
  positioning: LedPositioning,
): number {
  switch (positioning) {
    case "one_height":
      return heightMm;
    case "two_height":
      return 2 * heightMm;
    case "one_width":
      return widthMm;
    case "two_width":
      return 2 * widthMm;
    case "perimeter":
      return 2 * (widthMm + heightMm);
    default: {
      const _exhaustive: never = positioning;
      return _exhaustive;
    }
  }
}

export function applyLedLengthSupplement(baseLengthMm: number): LedLengthComputation {
  const baseLengthM = baseLengthMm / 1000;
  const totalLengthM = roundMoney(baseLengthM * (1 + LED_LENGTH_SUPPLEMENT_RATIO));
  const supplementM = roundMoney(totalLengthM - roundMoney(baseLengthM));

  return {
    baseLengthMm,
    baseLengthM: roundMoney(baseLengthM),
    supplementM,
    totalLengthM,
    source: "auto-rectangular",
  };
}

/**
 * Resolve LED length for a system.
 * - Rectangular mirrors: auto from positioning.
 * - Special shapes without a confirmed contour formula: require manual base mm
 *   (10% applied once on that base — never doubled).
 */
export function resolveLedLength(options: {
  shapeIsRectangular: boolean;
  widthMm: number;
  heightMm: number;
  positioning: LedPositioning;
  /** Manual base length in mm (before 10%). Used when auto is unavailable. */
  manualBaseLengthMm?: number | null;
}): LedLengthComputation | { error: string } {
  const {
    shapeIsRectangular,
    widthMm,
    heightMm,
    positioning,
    manualBaseLengthMm,
  } = options;

  if (shapeIsRectangular) {
    const baseMm = computeRectangularLedBaseMm(widthMm, heightMm, positioning);
    return applyLedLengthSupplement(baseMm);
  }

  // Special shapes: do not auto-use bounding-rect perimeter.
  if (
    manualBaseLengthMm === null ||
    manualBaseLengthMm === undefined ||
    !Number.isFinite(manualBaseLengthMm) ||
    manualBaseLengthMm <= 0
  ) {
    return {
      error:
        "Lungime LED de confirmat — formula de contur pentru această formă nu este validată. Introduceți lungimea de bază (mm).",
    };
  }

  return {
    ...applyLedLengthSupplement(manualBaseLengthMm),
    source: "manual",
    note: "Lungime LED de confirmat (manuală); supliment 10% aplicat o singură dată.",
  };
}

export function ledLengthCost(
  totalLengthM: number,
  pricePerMeter: number,
): number {
  return roundMoney(totalLengthM * pricePerMeter);
}
