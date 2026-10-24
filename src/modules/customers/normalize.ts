export type PhoneParts = { display: string; key: string };
export type OptionalKey = { display: string | null; key: string | null };

export function normalizePhone(raw: string): PhoneParts | null {
  const display = raw.trim().replace(/\s+/g, " ");
  if (!display || display.length > 40 || !/^[0-9+()\-.\s]+$/.test(display)) {
    return null;
  }
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) {
    return null;
  }
  return { display, key: digits };
}

export function normalizeEmail(raw: string): OptionalKey | null {
  const display = raw.trim();
  if (!display) {
    return { display: null, key: null };
  }
  if (display.length > 200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(display)) {
    return null;
  }
  return { display, key: display.toLowerCase() };
}

export function normalizeIdno(raw: string): OptionalKey | null {
  const compact = raw.trim().replace(/\s+/g, "");
  if (!compact) {
    return { display: null, key: null };
  }
  if (!/^\d{13}$/.test(compact)) {
    return null;
  }
  return { display: compact, key: compact };
}

export function phoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}
