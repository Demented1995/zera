"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { saveModelContent } from "@/modules/catalog/content/service";
import { canManageModelContent } from "@/modules/catalog/permissions";

export type ContentActionResult =
  | { ok: true; message: string; slug?: string }
  | { ok: false; message: string };

export async function saveModelContentAction(raw: unknown): Promise<ContentActionResult> {
  const session = await requireStaffSession();
  if (!canManageModelContent(session.user.role)) {
    return { ok: false, message: "Doar administratorul poate modifica descrierea și SEO." };
  }
  if (!raw || typeof raw !== "object") {
    return { ok: false, message: "Date invalide." };
  }
  const body = raw as Partial<{
    modelId: string;
    name: string;
    slug: string;
    slugEdited: boolean;
    shortDescription: string;
    descriptionSource: string;
    highlightsSource: string;
    careSource: string;
    warrantySource: string;
    deliverySource: string;
    extraSpecs: unknown;
    seoTitle: string;
    seoDescription: string;
    primaryImageId: string | null;
    primaryAltText: string | null;
  }>;
  if (!body.modelId) {
    return { ok: false, message: "Model invalid." };
  }

  const saved = await saveModelContent(prisma, {
    modelId: body.modelId,
    name: String(body.name ?? ""),
    slug: String(body.slug ?? ""),
    slugEdited: body.slugEdited === true,
    shortDescription: String(body.shortDescription ?? ""),
    descriptionSource: String(body.descriptionSource ?? ""),
    highlightsSource: String(body.highlightsSource ?? ""),
    careSource: String(body.careSource ?? ""),
    warrantySource: String(body.warrantySource ?? ""),
    deliverySource: String(body.deliverySource ?? ""),
    extraSpecs: body.extraSpecs,
    seoTitle: String(body.seoTitle ?? ""),
    seoDescription: String(body.seoDescription ?? ""),
    primaryImageId: body.primaryImageId ?? null,
    primaryAltText: body.primaryAltText === undefined ? null : String(body.primaryAltText),
  });
  if (!saved.ok) {
    return saved;
  }

  revalidatePath("/admin/modele");
  revalidatePath(`/admin/modele/${body.modelId}`);
  revalidatePath(`/admin/modele/${body.modelId}/descriere`);
  revalidatePath(`/admin/modele/${body.modelId}/previzualizare`);
  return { ok: true, message: "Descrierea a fost salvată.", slug: saved.slug };
}
