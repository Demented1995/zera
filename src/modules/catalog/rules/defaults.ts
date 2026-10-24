import {
  CONFIGURATOR_FEATURE_KEYS,
  type CompatibilityRule,
  type ConfiguratorFeatureKey,
  type ConfiguratorRulesV1,
  type FeatureRule,
} from "@/modules/catalog/rules/types";

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
