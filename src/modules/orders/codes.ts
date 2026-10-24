import { allocateSequentialNumber } from "@/modules/codes/sequence";

export async function nextOrderNumber(): Promise<string> {
  const prefix = `CMD-${new Date().getFullYear()}-`;
  return allocateSequentialNumber({
    name: prefix,
    prefix,
    latest: async (tx) => {
      const row = await tx.customerOrder.findFirst({
        where: { number: { startsWith: prefix } },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      return row?.number ?? null;
    },
  });
}
