import { prisma } from "@/lib/db/prisma";

export async function getCompanySettings() {
  const existing = await prisma.companySettings.findUnique({
    where: { id: "default" },
  });
  if (existing) {
    return existing;
  }
  return prisma.companySettings.create({
    data: { id: "default" },
  });
}

/** Required fields for issuing a customer PDF offer. */
export function missingCompanyFields(settings: {
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
}): string[] {
  const missing: string[] = [];
  if (!settings.legalName?.trim()) {
    missing.push("Denumirea legală a firmei");
  }
  if (!settings.taxId?.trim()) {
    missing.push("Cod fiscal / IDNO");
  }
  if (!settings.address?.trim()) {
    missing.push("Adresa firmei");
  }
  if (!settings.phone?.trim()) {
    missing.push("Telefon firmă");
  }
  return missing;
}
