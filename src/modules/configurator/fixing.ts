import { roundMoney } from "@/modules/pricing/engine/money";

export const SIMPLE_MIRROR_CATEGORY_SLUG = "oglinzi-simple";

export const MIRROR_FIXINGS = [
  { id: "adhesive", label: "Lipire" },
  { id: "plugs", label: "Cu dibluri" },
] as const;

export type MirrorFixingId = (typeof MIRROR_FIXINGS)[number]["id"];

/**
 * Customer extra for plugs.
 * "flat" charges the amount once. "area" charges it per m² of the mirror.
 */
export const PLUG_FIXING_BILLING: "flat" | "area" = "flat";
export const PLUG_FIXING_RATE_MDL = 250;

export function isMirrorFixingId(value: string): value is MirrorFixingId {
  return MIRROR_FIXINGS.some((item) => item.id === value);
}

export function plugFixingExtraMdl(areaM2: number): number {
  if (PLUG_FIXING_BILLING === "area") {
    return roundMoney(Math.max(0, areaM2) * PLUG_FIXING_RATE_MDL);
  }
  return PLUG_FIXING_RATE_MDL;
}
