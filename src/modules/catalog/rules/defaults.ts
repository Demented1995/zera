import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import { LED_TEMPERATURES } from "@/modules/configurator/lighting";
import {
  CONFIGURATOR_FEATURE_KEYS,
  type CompatibilityRule,
  type ConfiguratorFeatureKey,
  type ConfiguratorRulesV1,
  type FeatureRule,
} from "@/modules/catalog/rules/types";

/** Customer-entered size range for a newly created model. */
export const CUSTOMER_DIMENSION_MIN_MM = 300;
export const CUSTOMER_DIMENSION_MAX_MM = 2900;

/**
 * Safe defaults for models without configured rules:
 * everything FIXED — do not auto-enable public options.
 */
export function defaultConfiguratorRules(): ConfiguratorRulesV1 {
  const features = {} as Record<ConfiguratorFeatureKey, FeatureRule>;
  for (const key of CONFIGURATOR_FEATURE_KEYS) {
    features[key] = { mode: "FIXED", allowedValues: [] };
  }

  return {
    version: 1,
    dimensions: {
      width: { mode: "FIXED", minMm: null, maxMm: null, stepMm: null },
      height: { mode: "FIXED", minMm: null, maxMm: null, stepMm: null },
    },
    features,
    compatibility: defaultCompatibilityRules(),
  };
}

/**
 * A new model does not fix size, glass, or LED color.
 * The customer sets those on the product page; everything else stays fixed.
 */
export function newModelConfiguratorRules(): ConfiguratorRulesV1 {
  const rules = defaultConfiguratorRules();
  const dimensions = {
    mode: "EDITABLE" as const,
    minMm: CUSTOMER_DIMENSION_MIN_MM,
    maxMm: CUSTOMER_DIMENSION_MAX_MM,
    stepMm: null,
  };
  rules.dimensions.width = { ...dimensions };
  rules.dimensions.height = { ...dimensions };
  rules.features.width = { mode: "EDITABLE", allowedValues: [] };
  rules.features.height = { mode: "EDITABLE", allowedValues: [] };
  rules.features.glassType = {
    mode: "EDITABLE",
    allowedValues: CONFIGURATOR_GLASS_TYPES.map((item) => item.id),
  };
  rules.features.lightTemp = {
    mode: "EDITABLE",
    allowedValues: LED_TEMPERATURES.map((item) => String(item.id)),
  };
  return rules;
}

/** Structural dependencies confirmed by existing lighting/processing structure. */
export function defaultCompatibilityRules(): CompatibilityRule[] {
  return [
    { id: "light-temp-needs-led", kind: "requires_lighting" },
    { id: "led-position-needs-led", kind: "requires_lighting" },
    { id: "led-strip-needs-led", kind: "requires_lighting" },
    { id: "switch-needs-led", kind: "requires_lighting" },
    { id: "front-fields-need-front", kind: "requires_front_led" },
    { id: "back-fields-need-back", kind: "requires_back_led" },
    { id: "defog-control-needs-defog", kind: "requires_defog" },
  ];
}

export function resolveConfiguratorRules(
  raw: unknown | null | undefined,
): ConfiguratorRulesV1 {
  const base = defaultConfiguratorRules();
  if (!raw || typeof raw !== "object") {
    return base;
  }
  const incoming = raw as Partial<ConfiguratorRulesV1>;
  const features = { ...base.features };
  if (incoming.features) {
    for (const key of CONFIGURATOR_FEATURE_KEYS) {
      const rule = incoming.features[key];
      if (!rule) {
        continue;
      }
      features[key] = {
        mode: rule.mode ?? "FIXED",
        allowedValues: Array.isArray(rule.allowedValues)
          ? rule.allowedValues.map(String)
          : [],
      };
    }
  }

  return {
    version: 1,
    dimensions: {
      width: {
        mode: incoming.dimensions?.width?.mode ?? "FIXED",
        minMm: incoming.dimensions?.width?.minMm ?? null,
        maxMm: incoming.dimensions?.width?.maxMm ?? null,
        stepMm: incoming.dimensions?.width?.stepMm ?? null,
      },
      height: {
        mode: incoming.dimensions?.height?.mode ?? "FIXED",
        minMm: incoming.dimensions?.height?.minMm ?? null,
        maxMm: incoming.dimensions?.height?.maxMm ?? null,
        stepMm: incoming.dimensions?.height?.stepMm ?? null,
      },
    },
    features,
    compatibility:
      Array.isArray(incoming.compatibility) && incoming.compatibility.length > 0
        ? incoming.compatibility
        : base.compatibility,
  };
}
