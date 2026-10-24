import { prisma } from "@/lib/db/prisma";

export async function nextModelCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `MOD-${year}-`;
  const latest = await prisma.mirrorModel.findFirst({
    where: { code: { startsWith: prefix } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  let next = 1;
  if (latest?.code.startsWith(prefix)) {
    const parsed = Number.parseInt(latest.code.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed >= next) {
      next = parsed + 1;
    }
  }
  return `${prefix}${String(next).padStart(4, "0")}`;
}
