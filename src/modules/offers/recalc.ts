import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import {
  defaultCommercialConfig,
  type CommercialConfig,
} from "@/modules/configurator/commercial";
import {
  defaultLightingConfig,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import {
  defaultProcessingConfig,
  type ProcessingConfig,
} from "@/modules/configurator/processing";
import {
  getPricingSettings,
  loadCatalogMaterialsForEngine,
  toPricingRules,
} from "@/modules/pricing/queries";
import type { CalculationResult } from "@/modules/pricing/engine";

function asState(raw: Record<string, unknown>): ConfiguratorState {
  const lighting = {
    ...defaultLightingConfig(),
    ...((raw.lighting as LightingConfig | undefined) ?? {}),
  };
  const processing = {
    ...defaultProcessingConfig(),
    ...((raw.processing as ProcessingConfig | undefined) ?? {}),
  };
  const commercial = {
    ...defaultCommercialConfig(),
    ...((raw.commercial as CommercialConfig | undefined) ?? {}),
  };

  return {
    shapeId: String(raw.shapeId ?? "rectangular"),
    widthMm: Number(raw.widthMm),
    heightMm: Number(raw.heightMm),
    glassTypeId: String(raw.glassTypeId ?? "standard"),
    manualEdgeAddsMm: {
      left: Number((raw.manualEdgeAddsMm as { left?: number })?.left ?? 0),
      right: Number((raw.manualEdgeAddsMm as { right?: number })?.right ?? 0),
      top: Number((raw.manualEdgeAddsMm as { top?: number })?.top ?? 0),
      bottom: Number((raw.manualEdgeAddsMm as { bottom?: number })?.bottom ?? 0),
    },
    lighting,
    processing,
    commercial,
  };
}

export async function recalculateFromConfigPayload(
  raw: Record<string, unknown>,
): Promise<{
  state: ConfiguratorState;
  calculation: CalculationResult | null;
  blockers: string[];
}> {
  const state = asState(raw);
  const [settings, materials] = await Promise.all([
    getPricingSettings(),
    loadCatalogMaterialsForEngine(),
  ]);
  const quote = quoteConfigurator({
    state,
    materials,
    rules: toPricingRules(settings),
  });
  return {
    state,
    calculation: quote.calculation,
    blockers: quote.blockers,
  };
}
