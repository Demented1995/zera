import { z } from "zod";

import { customerConfigRequestSchema } from "@/modules/catalog/rules/schemas";
import { normalizePhone } from "@/modules/customers/normalize";
import { ONE_CLICK_ADDRESS } from "@/modules/orders/public";

const ORDER_STATUS_VALUES = ["NEW", "CLOSED_SUCCESS", "FAKE", "BRAK"] as const;

const MIRROR_STATUS_VALUES = [
  "WAITING",
  "TO_START",
  "ORDERED",
  "SENT_TO_SANDBLAST",
  "ASSEMBLED",
  "CLOSED_SUCCESS",
  "REFUSED",
  "BRAK",
] as const;

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

const placeOrderSchema = z
  .object({
    modelId: z.string().trim().min(1),
    request: customerConfigRequestSchema,
    customerName: text(200),
    customerPhone: z.string(),
    deliveryAddress: text(500),
  })
  .strict();

export type PlaceOrderData = {
  modelId: string;
  request: z.infer<typeof customerConfigRequestSchema>;
  customerName: string;
  customerPhone: { display: string; key: string };
  deliveryAddress: string;
};

const oneClickSchema = z
  .object({
    modelId: z.string().trim().min(1),
    request: customerConfigRequestSchema,
    customerName: text(200),
    customerPhone: z.string(),
    deliveryAddress: text(500).optional(),
  })
  .strict();

function optionalAddress(
  value: string | undefined,
): { ok: true; address: string } | { ok: false; message: string } {
  const address = value ?? "";
  if (address.length === 0) {
    return { ok: true, address: ONE_CLICK_ADDRESS };
  }
  if (address.length < 5) {
    return { ok: false, message: "Adresa este prea scurtă." };
  }
  return { ok: true, address };
}

export function parseOneClickOrder(
  raw: unknown,
): { ok: true; data: PlaceOrderData } | { ok: false; message: string } {
  const parsed = oneClickSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Datele cererii sunt invalide." };
  }
  if (parsed.data.customerName.length < 2) {
    return { ok: false, message: "Numele este obligatoriu." };
  }
  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) {
    return { ok: false, message: "Numărul de telefon este invalid." };
  }
  const address = optionalAddress(parsed.data.deliveryAddress);
  if (!address.ok) {
    return address;
  }
  return {
    ok: true,
    data: {
      modelId: parsed.data.modelId,
      request: parsed.data.request,
      customerName: parsed.data.customerName,
      customerPhone: phone,
      deliveryAddress: address.address,
    },
  };
}

const projectSchema = z
  .object({
    customerName: text(200),
    customerPhone: z.string(),
    deliveryAddress: text(500).optional(),
    message: text(1000).optional(),
  })
  .strict();

export type CustomProjectData = {
  customerName: string;
  customerPhone: { display: string; key: string };
  deliveryAddress: string;
  message: string;
};

export function parseCustomProject(
  raw: unknown,
): { ok: true; data: CustomProjectData } | { ok: false; message: string } {
  const parsed = projectSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Datele cererii sunt invalide." };
  }
  if (parsed.data.customerName.length < 2) {
    return { ok: false, message: "Numele este obligatoriu." };
  }
  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) {
    return { ok: false, message: "Numărul de telefon este invalid." };
  }
  const address = optionalAddress(parsed.data.deliveryAddress);
  if (!address.ok) {
    return address;
  }
  return {
    ok: true,
    data: {
      customerName: parsed.data.customerName,
      customerPhone: phone,
      deliveryAddress: address.address === ONE_CLICK_ADDRESS ? "" : address.address,
      message: parsed.data.message ?? "",
    },
  };
}

export function parsePlaceOrder(
  raw: unknown,
): { ok: true; data: PlaceOrderData } | { ok: false; message: string } {
  const parsed = placeOrderSchema.safeParse(raw);
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
  return {
    ok: true,
    data: {
      modelId: parsed.data.modelId,
      request: parsed.data.request,
      customerName: parsed.data.customerName,
      customerPhone: phone,
      deliveryAddress: parsed.data.deliveryAddress,
    },
  };
}

const statusSchema = z
  .object({
    orderId: z.string().trim().min(1),
    status: z.enum(ORDER_STATUS_VALUES),
    note: text(500),
  })
  .strict();

const mirrorStatusSchema = z
  .object({
    orderId: z.string().trim().min(1),
    mirrorKey: z.string().trim().min(1),
    status: z.enum(MIRROR_STATUS_VALUES),
  })
  .strict();

export function parseMirrorStatus(
  raw: unknown,
):
  | {
      ok: true;
      data: { orderId: string; mirrorKey: string; status: (typeof MIRROR_STATUS_VALUES)[number] };
    }
  | { ok: false; message: string } {
  const parsed = mirrorStatusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Statutul oglinzii este invalid." };
  }
  return { ok: true, data: parsed.data };
}

export function parseOrderStatus(
  raw: unknown,
):
  | { ok: true; data: { orderId: string; status: (typeof ORDER_STATUS_VALUES)[number]; note: string | null } }
  | { ok: false; message: string } {
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Statusul comenzii este invalid." };
  }
  return {
    ok: true,
    data: {
      orderId: parsed.data.orderId,
      status: parsed.data.status,
      note: parsed.data.note.length > 0 ? parsed.data.note : null,
    },
  };
}

const advanceSchema = z
  .object({
    orderId: z.string().trim().min(1),
    advanceAmount: z.number().finite().min(0).max(1_000_000),
  })
  .strict();

export function parseOrderAdvance(
  raw: unknown,
): { ok: true; data: { orderId: string; advanceAmount: number } } | { ok: false; message: string } {
  const parsed = advanceSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Avansul este invalid." };
  }
  const advance = Math.round(parsed.data.advanceAmount * 100) / 100;
  if (Math.abs(advance - parsed.data.advanceAmount) > 0.001) {
    return { ok: false, message: "Avansul poate avea cel mult două zecimale." };
  }
  return { ok: true, data: { orderId: parsed.data.orderId, advanceAmount: advance } };
}

const linkSchema = z
  .object({
    orderId: z.string().trim().min(1),
    customerCode: text(40),
  })
  .strict();

export function parseOrderCustomerLink(
  raw: unknown,
): { ok: true; data: { orderId: string; customerCode: string } } | { ok: false; message: string } {
  const parsed = linkSchema.safeParse(raw);
  if (!parsed.success || parsed.data.customerCode.length < 3) {
    return { ok: false, message: "Codul clientului este invalid." };
  }
  return { ok: true, data: parsed.data };
}
