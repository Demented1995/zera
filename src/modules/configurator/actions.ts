"use server";

import { requireStaffSession } from "@/lib/auth/guards";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import { configuratorInputSchema } from "@/modules/configurator/schemas";
import type { ConfiguratorQuote } from "@/modules/configurator/map-to-engine";
import {
  getPricingSettings,
  loadCatalogMaterialsForEngine,
  toPricingRules,
} from "@/modules/pricing/queries";

export type ConfiguratorActionResult =
  | { ok: true; quote: ConfiguratorQuote }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

export async function runConfiguratorQuoteAction(
  raw: unknown,
): Promise<ConfiguratorActionResult> {
  await requireStaffSession();

  const parsed = configuratorInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați forma și dimensiunile.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }

  const values = parsed.data;
  const [settings, materials] = await Promise.all([
    getPricingSettings(),
    loadCatalogMaterialsForEngine(),
  ]);

  const quote = quoteConfigurator({
    state: {
      shapeId: values.shapeId,
      widthMm: values.widthMm,
      heightMm: values.heightMm,
      glassTypeId: values.glassTypeId,
      manualEdgeAddsMm: {
        left: values.edgeLeftMm,
        right: values.edgeRightMm,
        top: values.edgeTopMm,
        bottom: values.edgeBottomMm,
      },
    },
    materials,
    rules: toPricingRules(settings),
  });

  return { ok: true, quote };
}
