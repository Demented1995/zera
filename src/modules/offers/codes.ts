import { allocateSequentialNumber } from "@/modules/codes/sequence";

function yearlyPrefix(kind: "CFG" | "OFT"): string {
  return `${kind}-${new Date().getFullYear()}-`;
}

export async function nextConfigurationCode(): Promise<string> {
  const prefix = yearlyPrefix("CFG");
  return allocateSequentialNumber({
    name: prefix,
    prefix,
    latest: async (tx) => {
      const row = await tx.savedConfiguration.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      return row?.code ?? null;
    },
  });
}

export async function nextOfferNumber(): Promise<string> {
  const prefix = yearlyPrefix("OFT");
  return allocateSequentialNumber({
    name: prefix,
    prefix,
    latest: async (tx) => {
      const row = await tx.customerOffer.findFirst({
        where: { number: { startsWith: prefix } },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      return row?.number ?? null;
    },
  });
}
