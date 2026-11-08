import { roundMoney } from "@/modules/pricing/engine/money";

/** Customer price for installation. Services are not marked up. */
export const INSTALL_MIN_CHARGE_MDL = 500;

/**
 * Installation charge for one mirror.
 * Charge is max(minimum, area × rate). The rate is the catalog price per m².
 */
export function computeInstallCost(
  areaM2: number,
  ratePerM2: number,
  minimumCharge: number,
): number {
  return roundMoney(Math.max(minimumCharge, areaM2 * ratePerM2));
}
