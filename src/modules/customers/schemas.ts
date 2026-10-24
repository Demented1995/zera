import { z } from "zod";

import { normalizeEmail, normalizeIdno, normalizePhone } from "@/modules/customers/normalize";

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

const notes = z
  .string()
  .transform((value) =>
    value
      .replace(/<[^>]*>/g, "")
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim()
      .slice(0, 4000),
  );

const addressSchema = z.object({
  label: text(40),
  line: text(200),
  city: text(80),
  postalCode: text(20),
  isPrimary: z.boolean(),
});

const customerSchema = z.object({
  id: z.string().trim().min(1).nullable().optional(),
  kind: z.enum(["INDIVIDUAL", "COMPANY"]),
  displayName: text(200),
  phone: z.string(),
  email: z.string(),
  companyName: text(200),
  idno: z.string(),
  contactName: text(200),
  notes,
  addresses: z.array(addressSchema).max(8),
});

export type CleanAddress = {
  label: string | null;
  line: string;
  city: string | null;
  postalCode: string | null;
  isPrimary: boolean;
  sortOrder: number;
};

export type CleanCustomer = {
  id: string | null;
  kind: "INDIVIDUAL" | "COMPANY";
  displayName: string;
  phone: string;
  phoneKey: string;
  email: string | null;
  emailKey: string | null;
  companyName: string | null;
  idno: string | null;
  idnoKey: string | null;
  contactName: string | null;
  notes: string | null;
  addresses: CleanAddress[];
};

export type CustomerParseResult =
  | { ok: true; data: CleanCustomer }
  | { ok: false; message: string };

function emptyToNull(value: string): string | null {
  return value.trim() ? value.trim() : null;
}

export function parseCustomerInput(raw: unknown): CustomerParseResult {
  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Datele clientului sunt invalide." };
  }
  const input = parsed.data;
  if (input.displayName.length < 2) {
    return { ok: false, message: "Numele trebuie să aibă cel puțin 2 caractere." };
  }
  const phone = normalizePhone(input.phone);
  if (!phone) {
    return {
      ok: false,
      message: "Telefonul trebuie să conțină între 8 și 15 cifre.",
    };
  }
  const email = normalizeEmail(input.email);
  if (!email) {
    return { ok: false, message: "Adresa de email nu este validă." };
  }
  const idno = normalizeIdno(input.idno);
  if (!idno) {
    return { ok: false, message: "IDNO trebuie să aibă 13 cifre." };
  }
  if (input.kind === "COMPANY" && !input.companyName) {
    return { ok: false, message: "Persoana juridică are nevoie de denumirea companiei." };
  }

  const filled = input.addresses.filter((address) => address.line);
  let primarySeen = false;
  const addresses: CleanAddress[] = filled.map((address, index) => {
    const isPrimary = address.isPrimary && !primarySeen;
    if (isPrimary) {
      primarySeen = true;
    }
    return {
      label: emptyToNull(address.label),
      line: address.line,
      city: emptyToNull(address.city),
      postalCode: emptyToNull(address.postalCode),
      isPrimary,
      sortOrder: index,
    };
  });
  if (addresses.length > 0 && !addresses.some((address) => address.isPrimary)) {
    addresses[0] = { ...addresses[0], isPrimary: true };
  }

  return {
    ok: true,
    data: {
      id: input.id ?? null,
      kind: input.kind,
      displayName: input.displayName,
      phone: phone.display,
      phoneKey: phone.key,
      email: email.display,
      emailKey: email.key,
      companyName: emptyToNull(input.companyName),
      idno: idno.display,
      idnoKey: idno.key,
      contactName: emptyToNull(input.contactName),
      notes: emptyToNull(input.notes),
      addresses,
    },
  };
}
