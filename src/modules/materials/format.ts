import { Prisma } from "@prisma/client";

import { UNCONFIRMED_UOM } from "@/modules/materials/constants";

export function formatMaterialPrice(
  unitPrice: Prisma.Decimal | string | number | null | undefined,
  currency = "MDL",
  unitOfMeasure?: string | null,
): string {
  if (unitPrice === null || unitPrice === undefined || unitPrice === "") {
    return "Preț nesetat";
  }

  const amount =
    unitPrice instanceof Prisma.Decimal
      ? unitPrice.toFixed(2)
      : Number(unitPrice).toFixed(2);

  const uom =
    !unitOfMeasure || unitOfMeasure === UNCONFIRMED_UOM
      ? null
      : unitOfMeasure;

  return uom ? `${amount} ${currency}/${uom}` : `${amount} ${currency}`;
}

export function decimalToFormValue(
  value: Prisma.Decimal | null | undefined,
): string {
  if (value === null || value === undefined) {
    return "";
  }
  return value.toString();
}

export function slugifyCategoryName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
