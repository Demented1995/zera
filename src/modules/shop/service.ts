import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { loadMirrorPreview } from "@/modules/catalog/preview/service";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import type { PreviewActionResult } from "@/modules/catalog/preview/types";
import { nextOrderNumber } from "@/modules/orders/codes";
import { placeOrder, quoteOrderConfiguration } from "@/modules/orders/service";
import type { PlaceOrderData } from "@/modules/orders/schemas";
import { allowCheckoutAttempt, checkoutTimingError } from "@/modules/shop/abuse";
import { isSellableModel } from "@/modules/shop/catalog";
import { lineTotal, pricesDiffer, type CheckoutData } from "@/modules/shop/checkout";
const UNAVAILABLE = "Modelul nu este disponibil.";

export async function quotePublicProduct(input: {
  modelId: string;
  request: CustomerConfigRequest;
}): Promise<PreviewActionResult> {
  if (!(await isSellableModel(input.modelId))) {
    return { ok: false, message: UNAVAILABLE };
  }
  const result = await loadMirrorPreview({
    modelId: input.modelId,
    request: input.request,
    includeDiagnostic: false,
  });
  if (!result.ok) {
    return result;
  }
  return { ok: true, customer: result.customer, diagnostic: null };
}

export async function placePublicOrder(
  input: PlaceOrderData,
): Promise<
  | { ok: true; id: string; number: string; retailPrice: number; currency: "MDL" }
  | { ok: false; message: string }
> {
  if (!(await isSellableModel(input.modelId))) {
    return { ok: false, message: UNAVAILABLE };
  }
  return placeOrder({
    ...input,
    placedById: null,
  });
}

export type CartOrderResult =
  | { ok: true; number: string }
  | {
      ok: false;
      code: "PRICE_CHANGED";
      message: string;
      updates: Array<{ lineId: string; unitPrice: number }>;
    }
  | { ok: false; code: "ERROR"; message: string };

export async function placeCartOrder(input: CheckoutData): Promise<CartOrderResult> {
  if (input.honeypot.trim()) {
    return { ok: false, code: "ERROR", message: "Cererea nu a putut fi trimisă." };
  }
  const timing = checkoutTimingError(input.startedAt);
  if (timing) {
    return { ok: false, code: "ERROR", message: timing };
  }

  const existing = await prisma.customerOrder.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
    select: { number: true, phoneKey: true },
  });
  if (existing) {
    if (existing.phoneKey !== input.customerPhone.key) {
      return { ok: false, code: "ERROR", message: "Cererea nu a putut fi trimisă." };
    }
    return { ok: true, number: existing.number };
  }

  if (!allowCheckoutAttempt(input.customerPhone.key)) {
    return {
      ok: false,
      code: "ERROR",
      message: "Prea multe încercări. Încercați din nou peste câteva minute.",
    };
  }

  const quotes = [];
  const updates: Array<{ lineId: string; unitPrice: number }> = [];
  for (const line of input.lines) {
    if (!(await isSellableModel(line.modelId))) {
      return { ok: false, code: "ERROR", message: "Un produs din coș nu mai este disponibil." };
    }
    const quoted = await quoteOrderConfiguration({
      modelId: line.modelId,
      request: line.request,
    });
    if (!quoted.ok) {
      return { ok: false, code: "ERROR", message: quoted.message };
    }
    if (pricesDiffer(line.expectedUnitPrice, quoted.quote.unitPrice)) {
      updates.push({ lineId: line.lineId, unitPrice: quoted.quote.unitPrice });
    }
    quotes.push({ line, quote: quoted.quote });
  }

  if (updates.length > 0) {
    return {
      ok: false,
      code: "PRICE_CHANGED",
      message: "Prețul unor produse s-a schimbat. Verificați noile prețuri și confirmați comanda.",
      updates,
    };
  }

  const first = quotes[0];
  if (!first) {
    return { ok: false, code: "ERROR", message: "Coșul este gol." };
  }
  const total = quotes.reduce(
    (sum, item) => sum + lineTotal(item.quote.unitPrice, item.line.quantity),
    0,
  );
  const quantity = quotes.reduce((sum, item) => sum + item.line.quantity, 0);
  const number = await nextOrderNumber();

  try {
    const created = await prisma.customerOrder.create({
      data: {
        number,
        status: "NEW",
        customerName: input.customerName,
        customerPhone: input.customerPhone.display,
        phoneKey: input.customerPhone.key,
        deliveryAddress: input.deliveryAddress,
        mirrorModelId: first.quote.modelId,
        modelCode: first.quote.modelCode,
        modelName: first.quote.modelName,
        configJson: first.quote.pricedConfig as unknown as Prisma.InputJsonValue,
        summaryJson: first.quote.summary as unknown as Prisma.InputJsonValue,
        retailPrice: Math.round(total * 100) / 100,
        currency: "MDL",
        advanceAmount: 0,
        quantity,
        idempotencyKey: input.idempotencyKey,
        placedById: null,
        statusEvents: {
          create: {
            fromStatus: null,
            toStatus: "NEW",
            note: "Comandă plasată din coș",
            changedById: null,
          },
        },
        lines: {
          create: quotes.map((item, index) => ({
            sortOrder: index,
            mirrorModelId: item.quote.modelId,
            modelCode: item.quote.modelCode,
            modelName: item.quote.modelName,
            imageId: item.quote.imageId,
            configJson: item.quote.pricedConfig as unknown as Prisma.InputJsonValue,
            summaryJson: item.quote.summary as unknown as Prisma.InputJsonValue,
            unitPrice: item.quote.unitPrice,
            quantity: item.line.quantity,
            lineTotal: lineTotal(item.quote.unitPrice, item.line.quantity),
          })),
        },
      },
      select: { number: true },
    });
    return { ok: true, number: created.number };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const raced = await prisma.customerOrder.findUnique({
        where: { idempotencyKey: input.idempotencyKey },
        select: { number: true, phoneKey: true },
      });
      if (raced && raced.phoneKey === input.customerPhone.key) {
        return { ok: true, number: raced.number };
      }
    }
    throw error;
  }
}
