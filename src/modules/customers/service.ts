import type { CustomerStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { nextCustomerCode } from "@/modules/customers/codes";
import type { CleanCustomer } from "@/modules/customers/schemas";

export type DuplicateMatch = {
  id: string;
  code: string;
  displayName: string;
  status: CustomerStatus;
  reasons: string[];
};

export async function findCustomerDuplicates(
  input: Pick<CleanCustomer, "phoneKey" | "emailKey" | "idnoKey">,
  exceptId?: string | null,
): Promise<DuplicateMatch[]> {
  const phoneTail = input.phoneKey.slice(-8);
  const or = [
    { phoneKey: input.phoneKey },
    ...(phoneTail.length >= 8 ? [{ phoneKey: { endsWith: phoneTail } }] : []),
    ...(input.emailKey ? [{ emailKey: input.emailKey }] : []),
    ...(input.idnoKey ? [{ idnoKey: input.idnoKey }] : []),
  ];
  const rows = await prisma.customer.findMany({
    where: {
      ...(exceptId ? { id: { not: exceptId } } : {}),
      OR: or,
    },
    select: {
      id: true,
      code: true,
      displayName: true,
      status: true,
      phoneKey: true,
      emailKey: true,
      idnoKey: true,
    },
    take: 8,
  });

  return rows.map((row) => {
    const reasons: string[] = [];
    if (
      row.phoneKey === input.phoneKey ||
      (phoneTail.length >= 8 && row.phoneKey.endsWith(phoneTail))
    ) {
      reasons.push("același telefon");
    }
    if (input.emailKey && row.emailKey === input.emailKey) {
      reasons.push("același email");
    }
    if (input.idnoKey && row.idnoKey === input.idnoKey) {
      reasons.push("același IDNO");
    }
    return {
      id: row.id,
      code: row.code,
      displayName: row.displayName,
      status: row.status,
      reasons,
    };
  });
}

export async function saveCustomer(
  data: CleanCustomer,
  userId: string,
): Promise<{ ok: true; id: string; duplicates: DuplicateMatch[] } | { ok: false; message: string }> {
  const duplicates = await findCustomerDuplicates(data, data.id);
  const addressData = data.addresses.map((address) => ({
    label: address.label,
    line: address.line,
    city: address.city,
    postalCode: address.postalCode,
    isPrimary: address.isPrimary,
    sortOrder: address.sortOrder,
  }));

  if (data.id) {
    const existing = await prisma.customer.findUnique({
      where: { id: data.id },
      select: { id: true },
    });
    if (!existing) {
      return { ok: false, message: "Clientul nu a fost găsit." };
    }
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: data.id },
        data: {
          kind: data.kind,
          displayName: data.displayName,
          phone: data.phone,
          phoneKey: data.phoneKey,
          email: data.email,
          emailKey: data.emailKey,
          companyName: data.companyName,
          idno: data.idno,
          idnoKey: data.idnoKey,
          contactName: data.contactName,
          notes: data.notes,
          updatedById: userId,
          addresses: { deleteMany: {} },
        },
      }),
      ...(addressData.length > 0
        ? [
            prisma.customerAddress.createMany({
              data: addressData.map((address) => ({
                ...address,
                customerId: data.id as string,
              })),
            }),
          ]
        : []),
    ]);
    return { ok: true, id: data.id, duplicates };
  }

  const created = await prisma.customer.create({
    data: {
      code: await nextCustomerCode(),
      kind: data.kind,
      displayName: data.displayName,
      phone: data.phone,
      phoneKey: data.phoneKey,
      email: data.email,
      emailKey: data.emailKey,
      companyName: data.companyName,
      idno: data.idno,
      idnoKey: data.idnoKey,
      contactName: data.contactName,
      notes: data.notes,
      createdById: userId,
      updatedById: userId,
      addresses: { create: addressData },
    },
    select: { id: true },
  });
  return { ok: true, id: created.id, duplicates };
}

export async function setCustomerStatus(
  id: string,
  status: CustomerStatus,
  userId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const existing = await prisma.customer.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return { ok: false, message: "Clientul nu a fost găsit." };
  }
  await prisma.customer.update({
    where: { id },
    data: { status, updatedById: userId },
  });
  return { ok: true };
}

export async function linkCustomerOffer(input: {
  customerId: string;
  offerId?: string;
  offerNumber?: string;
}): Promise<{ ok: true; offerId: string } | { ok: false; message: string }> {
  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
    select: { id: true },
  });
  if (!customer) {
    return { ok: false, message: "Clientul nu a fost găsit." };
  }
  const offer = input.offerId
    ? await prisma.customerOffer.findUnique({
        where: { id: input.offerId },
        select: { id: true, customerId: true, clientName: true, clientPhone: true },
      })
    : await prisma.customerOffer.findUnique({
        where: { number: input.offerNumber?.trim() || "" },
        select: { id: true, customerId: true, clientName: true, clientPhone: true },
      });
  if (!offer) {
    return { ok: false, message: "Oferta nu a fost găsită." };
  }
  if (offer.customerId && offer.customerId !== input.customerId) {
    return { ok: false, message: "Oferta este deja asociată altui client." };
  }
  await prisma.customerOffer.update({
    where: { id: offer.id },
    data: { customerId: input.customerId },
  });
  return { ok: true, offerId: offer.id };
}

export async function unlinkCustomerOffer(input: {
  customerId: string;
  offerId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const offer = await prisma.customerOffer.findUnique({
    where: { id: input.offerId },
    select: { id: true, customerId: true },
  });
  if (!offer || offer.customerId !== input.customerId) {
    return { ok: false, message: "Oferta nu este asociată acestui client." };
  }
  await prisma.customerOffer.update({
    where: { id: offer.id },
    data: { customerId: null },
  });
  return { ok: true };
}
