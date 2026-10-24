"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import {
  parseOrderAdvance,
  parseOrderCustomerLink,
  parseOrderStatus,
  parsePlaceOrder,
} from "@/modules/orders/schemas";
import {
  linkOrderCustomer,
  placeOrder,
  setOrderAdvance,
  setOrderStatus,
  unlinkOrderCustomer,
} from "@/modules/orders/service";
import type { PlaceOrderResult } from "@/modules/orders/public";

function denied(): { ok: false; message: string } {
  return { ok: false, message: "Acces interzis." };
}

export async function placeOrderAction(raw: unknown): Promise<PlaceOrderResult> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const parsed = parsePlaceOrder(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await placeOrder({
    ...parsed.data,
    placedById: session.user.id,
  });
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${saved.id}`);
  return { ok: true, number: saved.number };
}

export async function setOrderStatusAction(
  raw: unknown,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const parsed = parseOrderStatus(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await setOrderStatus({ ...parsed.data, changedById: session.user.id });
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${parsed.data.orderId}`);
  return { ok: true, message: "Statusul a fost actualizat." };
}

export async function setOrderAdvanceAction(
  raw: unknown,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const parsed = parseOrderAdvance(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await setOrderAdvance(parsed.data);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath(`/admin/comenzi/${parsed.data.orderId}`);
  return { ok: true, message: "Avansul a fost salvat." };
}

export async function linkOrderCustomerAction(
  raw: unknown,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const parsed = parseOrderCustomerLink(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await linkOrderCustomer(parsed.data);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath(`/admin/comenzi/${parsed.data.orderId}`);
  revalidatePath("/admin/clienti");
  return { ok: true, message: "Comanda a fost asociată clientului." };
}

export async function unlinkOrderCustomerAction(
  orderId: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const saved = await unlinkOrderCustomer(orderId);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath(`/admin/comenzi/${orderId}`);
  return { ok: true, message: "Asocierea cu clientul a fost eliminată." };
}
