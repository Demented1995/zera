/** Round half-up to 2 decimal places for display / money amounts. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Nearest leu for the price a customer sees and pays. 700,70 becomes 701. */
export function roundLei(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

export function applyMarkup(cost: number, markupPercent: number): number {
  return roundMoney(cost * (1 + markupPercent / 100));
}

export function parseNullableNumber(
  value: number | string | null | undefined,
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}
