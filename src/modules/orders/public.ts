import type { MirrorStatus, OrderStatus } from "@prisma/client";

export const ORDER_BUTTON_LABEL = "Plasează comanda";

export const ORDER_FORM_NOTE =
  "Nu este nevoie de cont sau parolă. Modelul, configurația și prețul se preiau automat.";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Nouă",
  CLOSED_SUCCESS: "Închisă cu succes",
  FAKE: "Fake",
  BRAK: "Brak",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export const MIRROR_STATUS_LABEL: Record<MirrorStatus, string> = {
  WAITING: "În așteptare",
  TO_START: "De dat în lucru",
  ORDERED: "Oglindă comandată",
  SENT_TO_SANDBLAST: "Oglindă trimisă la sablare",
  ASSEMBLED: "Gata asamblată",
  CLOSED_SUCCESS: "Închisă cu succes",
  REFUSED: "Refuz",
  BRAK: "Brak",
};

export const MIRROR_STATUSES = Object.keys(MIRROR_STATUS_LABEL) as MirrorStatus[];

const AUTOMATIC_ORDER_NOTES = new Set([
  "Comandă plasată",
  "Comandă plasată din coș",
  "Cumpărare cu un click",
  "Trimisă la producere",
]);

export function orderBoardComment(notes: Array<string | null | undefined>): string {
  const note = notes.find((item) => {
    const text = item?.trim();
    return Boolean(text) && !AUTOMATIC_ORDER_NOTES.has(text as string);
  });
  return note?.trim() || "—";
}

export function orderBoardMethod(features: string[]): string {
  if (features.some((item) => item.startsWith("Montaj:"))) {
    return "Montaj";
  }
  if (features.some((item) => item.startsWith("Livrare:"))) {
    return "Livrare";
  }
  return "Ridicare";
}

export type PlaceOrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
};

export type OneClickOrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
};

/** Stored when the customer did not enter an address. It is not a street. */
export const ONE_CLICK_ADDRESS = "Cumpărare cu un click";

/** A homepage inquiry, not a catalog model and not a price. */
export const CUSTOM_PROJECT_CODE = "PROIECT";
export const CUSTOM_PROJECT_NAME = "Oglindă personalizată";
export const CUSTOM_PROJECT_NOTE = "Proiect personalizat";

export function siteRequestLabel(input: {
  deliveryAddress: string;
  note: string | null | undefined;
}): string {
  if (input.note === CUSTOM_PROJECT_NOTE) {
    return "Proiect personalizat";
  }
  if (input.deliveryAddress === ONE_CLICK_ADDRESS || input.note === "Cumpărare cu un click") {
    return "Cumpără cu un click";
  }
  if (input.note === "Comandă plasată din coș") {
    return "Coș";
  }
  return "Formular din site";
}

export type PlaceOrderResult =
  | { ok: true; number: string }
  | { ok: false; message: string };

export function acceptedRetailPrice(
  calculation: { status: string; retailPrice: number | null } | null,
): number | null {
  if (!calculation || calculation.status !== "COMPLETE" || calculation.retailPrice == null) {
    return null;
  }
  if (!Number.isFinite(calculation.retailPrice) || calculation.retailPrice < 0) {
    return null;
  }
  return Math.round(calculation.retailPrice * 100) / 100;
}

/** Product retail plus delivery and mounting. Unset services are already 0. */
export function acceptedPayablePrice(
  calculation: {
    status: string;
    retailPrice: number | null;
    financial?: { offerRetail: number | null } | null;
  } | null,
): number | null {
  if (!calculation || calculation.status !== "COMPLETE") {
    return null;
  }
  const payable = calculation.financial?.offerRetail ?? calculation.retailPrice;
  if (payable == null || !Number.isFinite(payable) || payable < 0) {
    return null;
  }
  return Math.round(payable * 100) / 100;
}

export function orderBalance(retailPrice: number, advanceAmount: number): number {
  return Math.round((retailPrice - advanceAmount) * 100) / 100;
}

/** Mirror inside an order: CMD-2026-0013/1, /2, /3. */
export function mirrorCode(orderNumber: string, index: number): string {
  return `${orderNumber}/${index}`;
}

export function formatMdl(value: number): string {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MDL`;
}
