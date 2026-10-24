const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map<string, number[]>();

export function resetCheckoutLimits(): void {
  attempts.clear();
}

/** Limits repeated checkout attempts for one phone. A confirmed retry uses the same key and does not call this. */
export function allowCheckoutAttempt(phoneKey: string, now = Date.now()): boolean {
  const recent = (attempts.get(phoneKey) ?? []).filter((stamp) => now - stamp < WINDOW_MS);
  if (recent.length >= MAX_ATTEMPTS) {
    attempts.set(phoneKey, recent);
    return false;
  }
  recent.push(now);
  attempts.set(phoneKey, recent);
  return true;
}

export function checkoutTimingError(startedAt: number, now = Date.now()): string | null {
  if (!Number.isFinite(startedAt)) {
    return "Cererea nu a putut fi verificată.";
  }
  const age = now - startedAt;
  if (age < 2_000) {
    return "Formularul a fost trimis prea repede.";
  }
  if (age > 2 * 60 * 60 * 1000) {
    return "Formularul a expirat. Reîncărcați coșul.";
  }
  return null;
}
