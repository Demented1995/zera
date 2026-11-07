"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import {
  parseMirrorStatus,
  parseOrderAdvance,
  parseOrderCustomerLink,
  parseOrderStatus,
  parsePlaceOrder,
} from "@/modules/orders/schemas";
import { markSiteRequestOpened } from "@/modules/orders/queries";
import { formatMdl, type PlaceOrderResult } from "@/modules/orders/public";
import {
  addOrderMirror,
  deleteOrder,
  linkOrderCustomer,
  placeOrder,
  removeOrderMirror,
  saveOrderMirror,
  sendSiteRequestToProduction,
  setMirrorStatus,
  setOrderAdvance,
  setOrderStatus,
  unlinkOrderCustomer,
} from "@/modules/orders/service";
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

export async function markSiteRequestOpenedAction(orderId: string): Promise<void> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return;
  }
  await markSiteRequestOpened(orderId);
  revalidatePath("/admin", "layout");
}

export async function sendSiteRequestToProductionAction(
  orderId: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const saved = await sendSiteRequestToProduction({
    orderId,
    staffId: session.user.id,
  });
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/admin/oferte");
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${orderId}`);
  return { ok: true, message: "Comanda a fost trimisă la producere." };
}

export async function setMirrorStatusAction(
  raw: unknown,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const parsed = parseMirrorStatus(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await setMirrorStatus(parsed.data);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${parsed.data.orderId}`);
  revalidatePath(`/admin/comenzi/${parsed.data.orderId}/oglinzi/${parsed.data.mirrorKey}`);
  return { ok: true, message: "Statutul oglinzii a fost actualizat." };
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

export async function saveOrderMirrorAction(input: {
  orderId: string;
  mirrorKey: string;
  config: unknown;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  if (typeof input?.orderId !== "string" || typeof input.mirrorKey !== "string") {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const saved = await saveOrderMirror(input);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${input.orderId}`);
  revalidatePath(`/admin/comenzi/${input.orderId}/oglinzi/${input.mirrorKey}`);
  return { ok: true, message: `Parametrii au fost salvați. Preț: ${formatMdl(saved.price)}.` };
}

export async function addOrderMirrorAction(input: {
  orderId: string;
  modelId: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  if (typeof input?.orderId !== "string" || typeof input.modelId !== "string") {
    return { ok: false, message: "Alegeți un model." };
  }
  const saved = await addOrderMirror(input);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${input.orderId}`);
  return { ok: true, message: "Oglinda a fost adăugată la comandă." };
}

export async function removeOrderMirrorAction(input: {
  orderId: string;
  mirrorKey: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  if (typeof input?.orderId !== "string" || typeof input.mirrorKey !== "string") {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const saved = await removeOrderMirror(input);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${input.orderId}`);
  return { ok: true, message: "Oglinda a fost scoasă din comandă." };
}

export async function deleteOrderAction(
  orderId: string,
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return denied();
  }
  const saved = await deleteOrder(orderId);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Comanda a fost ștearsă." };
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
