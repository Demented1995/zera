import { allocateSequentialNumber } from "@/modules/codes/sequence";

export async function nextCustomerCode(): Promise<string> {
  const prefix = `CLT-${new Date().getFullYear()}-`;
  return allocateSequentialNumber({
    name: prefix,
    prefix,
    latest: async (tx) => {
      const row = await tx.customer.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      return row?.code ?? null;
    },
  });
}
