import { allocateSequentialNumber } from "@/modules/codes/sequence";

export async function nextModelCode(): Promise<string> {
  const prefix = `MOD-${new Date().getFullYear()}-`;
  return allocateSequentialNumber({
    name: prefix,
    prefix,
    latest: async (tx) => {
      const row = await tx.mirrorModel.findFirst({
        where: { code: { startsWith: prefix } },
        orderBy: { code: "desc" },
        select: { code: true },
      });
      return row?.code ?? null;
    },
  });
}
