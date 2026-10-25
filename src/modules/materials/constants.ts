/** Displayed when unit of measure has not been confirmed by an admin. */
export const UNCONFIRMED_UOM = "neconfirmat";

export const MATERIAL_CURRENCY = "MDL";

export const MATERIAL_UNITS = ["m²", "metru", "bucată", "serviciu"] as const;

export function materialUnitOptions(current?: string | null): string[] {
  if (current && !MATERIAL_UNITS.includes(current as (typeof MATERIAL_UNITS)[number])) {
    return [current, ...MATERIAL_UNITS];
  }
  return [...MATERIAL_UNITS];
}
