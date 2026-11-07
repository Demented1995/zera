"use server";

import { revalidatePath } from "next/cache";

import { parseCustomProject } from "@/modules/orders/schemas";
import type { PlaceOrderResult } from "@/modules/orders/public";
import { placeCustomProject } from "@/modules/shop/service";

export async function placeCustomProjectAction(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = parseCustomProject(raw);
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await placeCustomProject(parsed.data);
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/oferte");
  revalidatePath(`/admin/oferte/solicitari/${saved.id}`);
  return { ok: true, number: saved.number };
}
