import { z } from "zod";

import { customerConfigRequestSchema } from "@/modules/catalog/rules/schemas";
import { normalizePhone } from "@/modules/customers/normalize";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";

const text = (max: number) =>
  z
    .string()
    .transform((value) =>
      value
        .replace(/<[^>]*>/g, "")
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
        .replace(/[ \t]+/g, " ")
        .trim()
        .slice(0, max),
    );

const lineSchema = z
  .object({
    lineId: z.string().trim().min(8).max(40),
    modelId: z.string().trim().min(1),
    request: customerConfigRequestSchema,
    quantity: z.number().int().min(1).max(20),
    expectedUnitPrice: z.number().finite().min(0).max(1_000_000),
  })
  .strict();

const checkoutSchema = z
  .object({
    lines: z.array(lineSchema).min(1).max(8),
    customerName: text(200),
    customerPhone: z.string(),
    deliveryAddress: text(500),
    idempotencyKey: z.string().uuid(),
    honeypot: z.string().max(200),
    startedAt: z.number().int(),
  })
  .strict();

export type CheckoutLine = {
  lineId: string;
  modelId: string;
  request: CustomerConfigRequest;
  quantity: number;
  expectedUnitPrice: number;
};

export type CheckoutData = {
  lines: CheckoutLine[];
  customerName: string;
  customerPhone: { display: string; key: string };
  deliveryAddress: string;
  idempotencyKey: string;
  honeypot: string;
  startedAt: number;
};

export function parseCartCheckout(
  raw: unknown,
): { ok: true; data: CheckoutData } | { ok: false; message: string } {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Datele comenzii sunt invalide." };
  }
  if (parsed.data.customerName.length < 2) {
    return { ok: false, message: "Numele este obligatoriu." };
  }
  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) {
    return { ok: false, message: "Numărul de telefon este invalid." };
  }
  if (parsed.data.deliveryAddress.length < 5) {
    return { ok: false, message: "Adresa de livrare este obligatorie." };
  }
  const ids = new Set(parsed.data.lines.map((line) => line.lineId));
  if (ids.size !== parsed.data.lines.length) {
    return { ok: false, message: "Coșul conține linii duplicate." };
  }
  return {
    ok: true,
    data: {
      lines: parsed.data.lines,
      customerName: parsed.data.customerName,
      customerPhone: phone,
      deliveryAddress: parsed.data.deliveryAddress,
      idempotencyKey: parsed.data.idempotencyKey,
      honeypot: parsed.data.honeypot,
      startedAt: parsed.data.startedAt,
    },
  };
}

export function pricesDiffer(expected: number, actual: number): boolean {
  return Math.round(expected * 100) !== Math.round(actual * 100);
}

export function lineTotal(unitPrice: number, quantity: number): number {
  return Math.round(unitPrice * quantity * 100) / 100;
}
