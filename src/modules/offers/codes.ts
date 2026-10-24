import { prisma } from "@/lib/db/prisma";

function yearPrefix(kind: "CFG" | "OFT"): string {
  const year = new Date().getFullYear();
  return `${kind}-${year}-`;
}

async function nextSequential(
  kind: "CFG" | "OFT",
  findLatest: (prefix: string) => Promise<string | null>,
): Promise<string> {
  const prefix = yearPrefix(kind);
  const latest = await findLatest(prefix);
  let next = 1;
  if (latest?.startsWith(prefix)) {
    const tail = latest.slice(prefix.length);
    const parsed = Number.parseInt(tail, 10);
    if (Number.isFinite(parsed) && parsed >= next) {
      next = parsed + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export async function nextConfigurationCode(): Promise<string> {
  return nextSequential("CFG", async (prefix) => {
    const row = await prisma.savedConfiguration.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    return row?.code ?? null;
  });
}

export async function nextOfferNumber(): Promise<string> {
  return nextSequential("OFT", async (prefix) => {
    const row = await prisma.customerOffer.findFirst({
      where: { number: { startsWith: prefix } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    return row?.number ?? null;
  });
}
