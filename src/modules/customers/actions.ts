"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { canManageCustomers } from "@/modules/customers/permissions";
import { parseCustomerInput } from "@/modules/customers/schemas";
import {
  linkCustomerOffer,
  saveCustomer,
  setCustomerStatus,
  unlinkCustomerOffer,
  type DuplicateMatch,
} from "@/modules/customers/service";

export type CustomerActionResult =
  | { ok: true; id?: string; message: string; duplicates?: DuplicateMatch[] }
  | { ok: false; message: string };

function denied(): CustomerActionResult {
  return { ok: false, message: "Acces interzis." };
}

export async function saveCustomerAction(raw: unknown): Promise<CustomerActionResult> {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    return denied();
  }
  const parsed = parseCustomerInput(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await saveCustomer(parsed.data, session.user.id);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/clienti");
  revalidatePath(`/admin/clienti/${saved.id}`);
  return {
    ok: true,
    id: saved.id,
    duplicates: saved.duplicates,
    message:
      saved.duplicates.length > 0
        ? "Client salvat. Există posibile înregistrări duplicate."
        : "Client salvat.",
  };
}

export async function archiveCustomerAction(input: {
  id: string;
  archive: boolean;
}): Promise<CustomerActionResult> {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    return denied();
  }
  const result = await setCustomerStatus(
    input.id,
    input.archive ? "ARCHIVED" : "ACTIVE",
    session.user.id,
  );
  if (!result.ok) {
    return result;
  }
  revalidatePath("/admin/clienti");
  revalidatePath(`/admin/clienti/${input.id}`);
  return {
    ok: true,
    message: input.archive ? "Client arhivat." : "Client reactivat.",
  };
}

export async function linkCustomerOfferAction(input: {
  customerId: string;
  offerId?: string;
  offerNumber?: string;
}): Promise<CustomerActionResult> {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    return denied();
  }
  const result = await linkCustomerOffer(input);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/admin/clienti/${input.customerId}`);
  revalidatePath(`/admin/oferte/${result.offerId}`);
  return { ok: true, message: "Oferta a fost asociată. Datele ei nu au fost rescrise." };
}

export async function unlinkCustomerOfferAction(input: {
  customerId: string;
  offerId: string;
}): Promise<CustomerActionResult> {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    return denied();
  }
  const result = await unlinkCustomerOffer(input);
  if (!result.ok) {
    return result;
  }
  revalidatePath(`/admin/clienti/${input.customerId}`);
  revalidatePath(`/admin/oferte/${input.offerId}`);
  return { ok: true, message: "Oferta a fost despărțită de fișa clientului." };
}
