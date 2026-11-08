"use server";

import { createConfigurationLink } from "@/modules/shop/share";

export async function shareConfigurationAction(raw: {
  modelId: string;
  request: unknown;
}): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  if (!raw || typeof raw.modelId !== "string") {
    return { ok: false, message: "Datele cererii sunt invalide." };
  }
  return createConfigurationLink({ modelId: raw.modelId, request: raw.request });
}
