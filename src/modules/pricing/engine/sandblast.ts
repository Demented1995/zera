import { roundMoney } from "@/modules/pricing/engine/money";

/**
 * Decorative sandblast cost for one operation.
 * Charge is max(minimum, area × rate). Minimum applies once per decorative
 * sandblast operation, not per band.
 */
export function computeSandblastCost(
  areaM2: number,
  ratePerM2: number,
  minimumCharge: number,
): number {
  return roundMoney(Math.max(minimumCharge, areaM2 * ratePerM2));
}
