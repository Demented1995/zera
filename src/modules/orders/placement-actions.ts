"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import { parseMirrorPlacement } from "@/modules/orders/placement";
import { saveMirrorPlacement } from "@/modules/orders/service";

export async function saveMirrorPlacementAction(input: {
  orderId: string;
  mirrorKey: string;
  touchVertical: string;
  touchHorizontal: string;
  sandblastGapMm: string;
  sandblastThicknessMm: string;
}): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    return { ok: false, message: "Acces interzis." };
  }
  if (typeof input?.orderId !== "string" || typeof input.mirrorKey !== "string") {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const parsed = parseMirrorPlacement({
    touchVertical: input.touchVertical,
    touchHorizontal: input.touchHorizontal,
    sandblastGapMm: input.sandblastGapMm,
    sandblastThicknessMm: input.sandblastThicknessMm,
  });
  if (!parsed.ok) {
    return parsed;
  }
  const saved = await saveMirrorPlacement({
    orderId: input.orderId,
    mirrorKey: input.mirrorKey,
    placement: parsed.placement,
  });
  if (!saved.ok) {
    return saved;
  }
  revalidatePath("/admin/comenzi");
  revalidatePath(`/admin/comenzi/${input.orderId}`);
  revalidatePath(`/admin/comenzi/${input.orderId}/oglinzi/${input.mirrorKey}`);
  return { ok: true, message: "Amplasarea a fost salvată." };
}
