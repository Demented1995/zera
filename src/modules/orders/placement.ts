export const TOUCH_VERTICAL = [
  { id: "top", label: "Sus" },
  { id: "middle", label: "Mijloc" },
  { id: "bottom", label: "Jos" },
] as const;

export const TOUCH_HORIZONTAL = [
  { id: "left", label: "Stânga" },
  { id: "center", label: "Mijloc" },
  { id: "right", label: "Dreapta" },
] as const;

export type TouchVertical = (typeof TOUCH_VERTICAL)[number]["id"];
export type TouchHorizontal = (typeof TOUCH_HORIZONTAL)[number]["id"];

/** Order-only workshop placement. It is not part of the priced configuration. */
export type MirrorPlacement = {
  touchVertical: TouchVertical | "";
  touchHorizontal: TouchHorizontal | "";
  sandblastGapMm: number | null;
  sandblastThicknessMm: number | null;
};

const EMPTY: MirrorPlacement = {
  touchVertical: "",
  touchHorizontal: "",
  sandblastGapMm: null,
  sandblastThicknessMm: null,
};

function asChoice<T extends string>(value: unknown, allowed: readonly T[]): T | "" | null {
  if (value == null || value === "") {
    return "";
  }
  if (typeof value !== "string") {
    return null;
  }
  return allowed.includes(value as T) ? (value as T) : null;
}

function asMillimetres(value: unknown): number | null | "invalid" {
  if (value == null || value === "") {
    return null;
  }
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!text) {
    return null;
  }
  if (!/^\d+$/.test(text)) {
    return "invalid";
  }
  const parsed = Number(text);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2000) {
    return "invalid";
  }
  return parsed;
}

export function readMirrorPlacement(raw: unknown): MirrorPlacement {
  if (!raw || typeof raw !== "object") {
    return { ...EMPTY };
  }
  const value = raw as Record<string, unknown>;
  const touchVertical = asChoice(value.touchVertical, TOUCH_VERTICAL.map((item) => item.id));
  const touchHorizontal = asChoice(value.touchHorizontal, TOUCH_HORIZONTAL.map((item) => item.id));
  const sandblastGapMm = asMillimetres(value.sandblastGapMm);
  const sandblastThicknessMm = asMillimetres(value.sandblastThicknessMm);
  if (
    touchVertical == null ||
    touchHorizontal == null ||
    sandblastGapMm === "invalid" ||
    sandblastThicknessMm === "invalid"
  ) {
    return { ...EMPTY };
  }
  return { touchVertical, touchHorizontal, sandblastGapMm, sandblastThicknessMm };
}

export function parseMirrorPlacement(raw: unknown): { ok: true; placement: MirrorPlacement } | { ok: false; message: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Amplasarea este invalidă." };
  }
  const value = raw as Record<string, unknown>;
  const touchVertical = asChoice(value.touchVertical, TOUCH_VERTICAL.map((item) => item.id));
  const touchHorizontal = asChoice(value.touchHorizontal, TOUCH_HORIZONTAL.map((item) => item.id));
  const sandblastGapMm = asMillimetres(value.sandblastGapMm);
  const sandblastThicknessMm = asMillimetres(value.sandblastThicknessMm);
  if (touchVertical == null || touchHorizontal == null) {
    return { ok: false, message: "Amplasarea touch este invalidă." };
  }
  if (sandblastGapMm === "invalid") {
    return { ok: false, message: "Spațiul până la sablare este invalid." };
  }
  if (sandblastThicknessMm === "invalid") {
    return { ok: false, message: "Grosimea sablării este invalidă." };
  }
  return {
    ok: true,
    placement: { touchVertical, touchHorizontal, sandblastGapMm, sandblastThicknessMm },
  };
}

export function touchPlacementLabel(placement: MirrorPlacement): string {
  const vertical = TOUCH_VERTICAL.find((item) => item.id === placement.touchVertical)?.label;
  const horizontal = TOUCH_HORIZONTAL.find((item) => item.id === placement.touchHorizontal)?.label;
  const parts = [vertical, horizontal].filter((item): item is string => Boolean(item));
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function millimetreLabel(value: number | null): string {
  return value == null ? "—" : `${value} mm`;
}
