/** Compact retail supplement for a customer option. Not an internal cost. */
export function formatSupplementMdl(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const digits = Number.isInteger(rounded) ? 0 : 2;
  const amount = new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(rounded));
  if (rounded === 0) {
    return "0 mdl";
  }
  return `${rounded > 0 ? "+" : "−"}${amount} mdl`;
}
