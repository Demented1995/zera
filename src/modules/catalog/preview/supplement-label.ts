import { roundLei } from "@/modules/pricing/engine/money";

/** Compact retail supplement for a customer option. Not an internal cost. */
export function formatSupplementMdl(value: number): string {
  const rounded = roundLei(value);
  const amount = new Intl.NumberFormat("ro-RO", {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));
  if (rounded === 0) {
    return "0 mdl";
  }
  return `${rounded > 0 ? "+" : "−"}${amount} mdl`;
}
