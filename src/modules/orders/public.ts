import type { OrderStatus } from "@prisma/client";

export const ORDER_BUTTON_LABEL = "Plasează comanda";

export const ORDER_FORM_NOTE =
  "Nu este nevoie de cont sau parolă. Modelul, configurația și prețul se preiau automat.";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: "Nouă",
  CONFIRMED: "Confirmată",
  IN_PRODUCTION: "În producție",
  READY: "Pregătită",
  DELIVERED: "Livrată",
  COMPLETED: "Finalizată",
  CANCELLED: "Anulată",
};

export const ORDER_STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export type PlaceOrderInput = {
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
};

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

export function orderBalance(retailPrice: number, advanceAmount: number): number {
  return Math.round((retailPrice - advanceAmount) * 100) / 100;
}

export function formatMdl(value: number): string {
  return `${new Intl.NumberFormat("ro-RO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} MDL`;
}
