/** Per-feature commercial mode for future customer configurator. */
export type FeatureMode = "FIXED" | "EDITABLE" | "HIDDEN";

/**
 * Stable feature keys reused from the professional configurator / materials catalog.
 * HIDDEN ≠ disabling a component — defaults stay server-side when required.
 */
export const CONFIGURATOR_FEATURE_KEYS = [
  "shape",
  "width",
  "height",
  "glassType",
  "frontLed",
  "backLed",
  "ledPosition",
  "ledStripType",
  "lightTemp",
  "switchType",
  "defog",
  "frames",
  "facets",
  "decorativeSandblast",
  "engraving",
  "cutouts",
  "accessories",
  "logo",
  "antiShatterFilm",
] as const;

export type ConfiguratorFeatureKey = (typeof CONFIGURATOR_FEATURE_KEYS)[number];

export type FeatureRule = {
  mode: FeatureMode;
  /** Allowed option IDs when mode === EDITABLE. Empty = no options allowed. */
  allowedValues?: string[];
};

export type DimensionLimitRule = {
  mode: FeatureMode;
  minMm?: number | null;
  maxMm?: number | null;
  stepMm?: number | null;
};

/**
 * Optional configurable compatibility constraints (not a full invented matrix).
 * Only dependencies that map to existing structure.
 */
export type CompatibilityRule = {
  /** When feature A is disabled/absent, feature B must not be actively changed by the client. */
  id: string;
  kind:
    | "requires_lighting"
    | "requires_front_led"
    | "requires_back_led"
    | "requires_defog"
    | "forbidden_frame_shape";
  /** Optional shape IDs forbidden for a given frame type. */
  frameTypeId?: string;
  forbiddenShapeIds?: string[];
};

export type ConfiguratorRulesV1 = {
  version: 1;
  dimensions: {
    width: DimensionLimitRule;
    height: DimensionLimitRule;
  };
  features: Record<ConfiguratorFeatureKey, FeatureRule>;
  compatibility: CompatibilityRule[];
};

/** Customer-submitted patch — only allowed fields may apply. */
export type CustomerConfigRequest = {
  shapeId?: string;
  widthMm?: number;
  heightMm?: number;
  glassTypeId?: string;
  /** Enable/disable front LED system. */
  frontLedEnabled?: boolean;
  backLedEnabled?: boolean;
  frontLedPositioning?: string;
  backLedPositioning?: string;
  frontLedStripTypeId?: string;
  backLedStripTypeId?: string;
  frontLightTempK?: number;
  backLightTempK?: number;
  switchType?: string;
  switchQty?: number;
  defogEnabled?: boolean;
  defogSize?: string;
  defogControl?: string;
  frameType?: string;
  facetEnabled?: boolean;
  facetShape?: string;
  facetWidthMm?: number;
  sandblastFinish?: string;
  engravingEnabled?: boolean;
  cutouts?: Array<{ type: string; qty: number }>;
  accessoryIds?: string[];
  logoIds?: string[];
  antiShatterFilmEnabled?: boolean;
};

export type ValidationIssue = {
  code: string;
  feature?: ConfiguratorFeatureKey | "compatibility" | "price";
  message: string;
};

export type ValidateCustomerConfigResult =
  | {
      ok: true;
      config: import("@/modules/configurator/map-to-engine").ConfiguratorState;
      rejected: ValidationIssue[];
      applied: string[];
    }
  | {
      ok: false;
      config: import("@/modules/configurator/map-to-engine").ConfiguratorState;
      rejected: ValidationIssue[];
      applied: string[];
    };
