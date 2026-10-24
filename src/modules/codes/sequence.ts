import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

function issuedTail(code: string | null, prefix: string): number {
  if (!code?.startsWith(prefix)) {
    return 0;
  }
  const parsed = Number.parseInt(code.slice(prefix.length), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 0;
  }
  return parsed;
}

/** Reserves the next yearly code. A failed save leaves a gap and does not reuse the number. */
export async function allocateSequentialNumber(input: {
  name: string;
  prefix: string;
  latest: (tx: Prisma.TransactionClient) => Promise<string | null>;
}): Promise<string> {
  const next = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.name})::bigint)`;
    const issued = issuedTail(await input.latest(tx), input.prefix);
    const row = await tx.numberSequence.findUnique({
      where: { name: input.name },
      select: { last: true },
    });
    const value = Math.max(row?.last ?? 0, issued) + 1;
    await tx.numberSequence.upsert({
      where: { name: input.name },
      create: { name: input.name, last: value },
      update: { last: value },
    });
    return value;
  });
  return `${input.prefix}${String(next).padStart(4, "0")}`;
}
