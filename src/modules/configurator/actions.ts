"use server";

import { requireStaffSession } from "@/lib/auth/guards";
import {
  defaultLedSystem,
  defaultLightingConfig,
  type ExtraComponentConfig,
  type LightingConfig,
  type SwitchConfig,
} from "@/modules/configurator/lighting";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import type { ConfiguratorQuote } from "@/modules/configurator/map-to-engine";
import {
  defaultProcessingConfig,
  type ProcessingConfig,
} from "@/modules/configurator/processing";
import { configuratorInputSchema } from "@/modules/configurator/schemas";
import {
  getPricingSettings,
  loadCatalogMaterialsForEngine,
  toPricingRules,
} from "@/modules/pricing/queries";

export type ConfiguratorActionResult =
  | { ok: true; quote: ConfiguratorQuote }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function toLightingConfig(
  values: ReturnType<typeof configuratorInputSchema.parse>,
): LightingConfig {
  const base = defaultLightingConfig();
  const front = { ...defaultLedSystem(), ...values.frontLed };
  const back = { ...defaultLedSystem(), ...values.backLed };

  const extrasById = new Map(
    values.extraComponents.map((item) => [item.id, item]),
  );
  const extraComponents: ExtraComponentConfig[] = base.extraComponents.map(
    (item) => {
      const incoming = extrasById.get(item.id);
      if (!incoming) {
        return item;
      }
      return {
        id: incoming.id,
        enabled: incoming.enabled,
        qty: incoming.qty,
        side: incoming.side,
      };
    },
  );

  const switches: SwitchConfig[] = values.switches.map((item) => ({
    type: item.type,
    qty: item.qty,
    associatedSystem: item.associatedSystem,
  }));

  return {
    lightingType: values.lightingType,
    front,
    back,
    switches,
    transformerPcs: values.transformerPcs,
    electricalConnection: values.electricalConnection,
    extraComponents,
  };
}

function toProcessingConfig(
  values: ReturnType<typeof configuratorInputSchema.parse>,
): ProcessingConfig {
  const base = defaultProcessingConfig();
  const incoming = values.processing;
  if (!incoming) {
    return base;
  }

  const accessoriesById = new Map(
    incoming.accessories.map((item) => [item.id, item]),
  );
  const brandingById = new Map(
    incoming.branding.map((item) => [item.id, item]),
  );

  return {
    ...base,
    ...incoming,
    sandblastBands:
      incoming.sandblastBands.length > 0
        ? incoming.sandblastBands
        : base.sandblastBands,
    mountingComponents:
      incoming.mountingComponents.length > 0
        ? incoming.mountingComponents
        : base.mountingComponents,
    accessories: base.accessories.map((item) => {
      const next = accessoriesById.get(item.id);
      return next
        ? {
            id: next.id,
            enabled: next.enabled,
            qty: next.qty,
            note: next.note,
          }
        : item;
    }),
    branding: base.branding.map((item) => {
      const next = brandingById.get(item.id);
      return next
        ? { id: next.id, enabled: next.enabled, qty: next.qty }
        : item;
    }),
  };
}

export async function runConfiguratorQuoteAction(
  raw: unknown,
): Promise<ConfiguratorActionResult> {
  await requireStaffSession();

  const parsed = configuratorInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați forma, dimensiunile, iluminarea și prelucrările.",
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
      lighting: toLightingConfig(values),
      processing: toProcessingConfig(values),
    },
    materials,
    rules: toPricingRules(settings),
  });

  return { ok: true, quote };
}
