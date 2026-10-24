"use server";

import { revalidatePath } from "next/cache";

import { quoteCustomerConfigSchema } from "@/modules/catalog/rules/schemas";
import type { PreviewActionResult } from "@/modules/catalog/preview/types";
import { parsePlaceOrder } from "@/modules/orders/schemas";
import type { PlaceOrderResult } from "@/modules/orders/public";
import { parseCartCheckout } from "@/modules/shop/checkout";
import { placeCartOrder, placePublicOrder, quotePublicProduct, type CartOrderResult } from "@/modules/shop/service";

export async function quotePublicProductAction(raw: unknown): Promise<PreviewActionResult> {
  const parsed = quoteCustomerConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Cererea de previzualizare este invalidă." };
  }
  return quotePublicProduct(parsed.data);
}

export async function placePublicOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = parsePlaceOrder(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await placePublicOrder(parsed.data);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  return { ok: true, number: saved.number };
}

export async function placeCartOrderAction(raw: unknown): Promise<CartOrderResult> {
  const parsed = parseCartCheckout(raw);
  if (!parsed.ok) {
    return { ok: false, code: "ERROR", message: parsed.message };
  }
  const saved = await placeCartOrder(parsed.data);
  if (saved.ok) {
    revalidatePath("/admin/comenzi");
  }
  return saved;
}
