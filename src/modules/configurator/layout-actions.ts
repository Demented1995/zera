"use server";

import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { normalizeConfiguratorLayout } from "@/modules/configurator/layout";
import { saveConfiguratorLayout } from "@/modules/configurator/layout-store";

export async function saveConfiguratorLayoutAction(raw: unknown): Promise<
  | { ok: true; message: string }
  | { ok: false; message: string }
> {
  await requireStaffSession();
  const sections = normalizeConfiguratorLayout(raw);
  if (!sections.some((section) => section.enabled)) {
    return {
      ok: false,
      message: "Lasă cel puțin o categorie inclusă în configurator.",
    };
  }
  await saveConfiguratorLayout(sections);
  revalidatePath("/admin");
  revalidatePath("/admin/configurator");
  revalidatePath("/admin/configurator/structura");
  revalidatePath("/admin/modele");
  return { ok: true, message: "Structura configuratorului a fost salvată." };
}
