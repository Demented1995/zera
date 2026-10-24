"use server";

import { requireStaffSession } from "@/lib/auth/guards";
import { canViewCatalog } from "@/modules/catalog/permissions";
import { quoteCustomerConfigSchema } from "@/modules/catalog/rules/schemas";

import { loadMirrorPreview } from "@/modules/catalog/preview/service";
import type { PreviewActionResult } from "@/modules/catalog/preview/types";

export async function previewMirrorModelAction(
  raw: unknown,
): Promise<PreviewActionResult> {
  const session = await requireStaffSession();
  if (!canViewCatalog(session.user.role)) {
    return { ok: false, message: "Acces interzis." };
  }

  const parsed = quoteCustomerConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Cererea de previzualizare este invalidă." };
  }

  return loadMirrorPreview({
    modelId: parsed.data.modelId,
    request: parsed.data.request,
    role: session.user.role,
  });
}

/** Product-page quotes. Same engine as the configurator, without admin diagnostics. */
export async function previewProductPageAction(
  raw: unknown,
): Promise<PreviewActionResult> {
  const session = await requireStaffSession();
  if (!canViewCatalog(session.user.role)) {
    return { ok: false, message: "Acces interzis." };
  }

  const parsed = quoteCustomerConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Cererea de previzualizare este invalidă." };
  }

  const result = await loadMirrorPreview({
    modelId: parsed.data.modelId,
    request: parsed.data.request,
    role: session.user.role,
  });
  if (!result.ok) {
    return result;
  }
  return { ok: true, customer: result.customer, diagnostic: null };
}
