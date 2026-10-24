/** Shape of the glass blank used for area pricing. */
export type GlassShapeKind = "RECTANGLE" | "SPECIAL";

/**
 * Per-side curved-edge additions in mm.
 * Only sides the admin/configurator marks as curved should receive the standard add.
 * Never auto-applied to all asymmetric shapes.
 */
export type CurvedEdgeAddsMm = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type CatalogMaterial = {
  seedKey: string;
  name: string;
  unitPrice: number | null;
  unitOfMeasure: string;
  isActive: boolean;
};

export type PricingRules = {
  wholesaleMarkupPercent: number;
  retailMarkupPercent: number;
  curvedEdgeAddMm: number;
  sandblastMinCharge: number;
};

export type ComponentQuantities = {
  /** Explicit LED strip length in meters. */
  ledMeters: number;
  /** Explicit transformer count. */
  transformerPcs: number;
  /**
   * Explicit touch sensors. Price includes symbol sandblast —
   * do not add a separate sandblast line for the touch symbol.
   */
  touchPcs: number;
};

/**
 * Detailed electrical / accessory lines from the configurator (Stage 5.2+).
 * When present, these are priced in addition to (or instead of) the simple
 * aggregated `components.ledMeters` for LED — set ledMeters to 0 if using
 * detailed LED lines to avoid double counting.
 */
export type DetailedComponentLine = {
  key: string;
  label: string;
  /** Catalog seed key; null means unpriced / unconfigured (unless unitPriceOverride). */
  seedKey: string | null;
  quantity: number;
  unit: string;
  group:
    | "led-front"
    | "led-back"
    | "switch"
    | "transformer"
    | "accessory"
    | "other"
    | "sandblast"
    | "facet"
    | "engraving"
    | "defog"
    | "frame"
    | "mounting"
    | "cutout"
    | "product-accessory"
    | "branding";
  note?: string;
  /** When true and unpriced, marks calculation INCOMPLETE. */
  required?: boolean;
  /**
   * Explicit admin-configured unit price (e.g. engraving).
   * Used only when seedKey is null — never invents catalog rates.
   */
  unitPriceOverride?: number | null;
};

export type ProcessingCostBreakdown = {
  sandblast: number | null;
  facets: number | null;
  engraving: number | null;
  defog: number | null;
  frames: number | null;
  mounting: number | null;
  cutouts: number | null;
  accessories: number | null;
  branding: number | null;
  total: number | null;
};

/**
 * Explicit production labor line (Stage 5.4).
 * Enters sinecost; tariffs come from admin config — never invented.
 */
export type LaborLine = {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  required?: boolean;
  note?: string;
};

/**
 * Commercial service line (extra packaging / delivery / install).
 * Excluded from wholesale/retail markups.
 */
export type ServiceLine = {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  group: "packaging-extra" | "delivery" | "install" | "other";
  required?: boolean;
  note?: string;
};

export type CalculationInput = {
  widthMm: number;
  heightMm: number;
  shape: GlassShapeKind;
  /** Which outer edges are curved; values are 0 or the standard add (applied by engine from rules). */
  curvedEdges: {
    left: boolean;
    right: boolean;
    top: boolean;
    bottom: boolean;
  };
  /**
   * Optional explicit per-side mm adds (e.g. custom shape from configurator).
   * When set, overrides boolean curvedEdges + standard curvedEdgeAddMm.
   */
  explicitCurvedEdgeAddsMm?: CurvedEdgeAddsMm;
  components: ComponentQuantities;
  detailedComponents?: DetailedComponentLine[];
  /**
   * Decorative sandblast area in m² (separate from touch-symbol sandblast).
   * One minimum charge applies per decorative sandblast operation, not per band.
   */
  decorativeSandblastAreaM2: number;
  /**
   * Detailed production labor lines (preferred for Stage 5.4).
   * When present, replaces simple laborCost aggregation.
   */
  laborLines?: LaborLine[];
  /**
   * Packaging required by the product — enters sinecost (F).
   */
  packagingIncludedLines?: LaborLine[];
  /**
   * Optional labor cost already configured elsewhere (legacy / calculator).
   * Null/undefined = not configured (not treated as 0).
   * Ignored when laborLines is non-empty.
   */
  laborCost?: number | null;
  /**
   * Detailed commercial services (preferred). Excluded from markups.
   */
  serviceLines?: ServiceLine[];
  /**
   * Delivery/install/commercial services — tracked separately;
   * markups are NOT auto-applied to these.
   * Ignored when serviceLines is non-empty.
   */
  serviceCosts?: number | null;
  materials: CatalogMaterial[];
  rules: PricingRules;
};

export type CostLineKind =
  | "GLASS"
  | "COMPONENT"
  | "OPERATION"
  | "LABOR"
  | "SERVICE";

export type CostLine = {
  kind: CostLineKind;
  key: string;
  label: string;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  amount: number | null;
  note?: string;
  incompleteReason?: string;
};

export type CalculationStatus = "COMPLETE" | "INCOMPLETE";

export type ElectricalCostBreakdown = {
  frontLed: number | null;
  backLed: number | null;
  switches: number | null;
  transformers: number | null;
  accessories: number | null;
  total: number | null;
};

/**
 * Commercial services excluded from product markups (Stage 5.4).
 */
export type CommercialServicesBreakdown = {
  packagingExtra: number | null;
  delivery: number | null;
  install: number | null;
  other: number | null;
  total: number | null;
};

/**
 * Product financial summary A–F → sinecost; services separate.
 * A glass, B LED/electric, C processing (ops), D accessories/branding,
 * E production labor, F included packaging.
 */
export type FinancialSummary = {
  glass: number | null;
  led: number | null;
  processing: number | null;
  accessories: number | null;
  labor: number | null;
  packagingIncluded: number | null;
  /** A+…+F — subject to wholesale/retail markups. */
  sinecost: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  services: CommercialServicesBreakdown;
  /** Selected product price (wholesale or retail) + services — set by configurator. */
  offerWholesale: number | null;
  offerRetail: number | null;
};

export type CalculationResult = {
  status: CalculationStatus;
  glassCost: number | null;
  componentCosts: number | null;
  operationCosts: number | null;
  laborCost: number | null;
  packagingIncludedCost?: number | null;
  /** Production cost subject to wholesale/retail markups. */
  totalProductionCost: number | null;
  /** Services excluded from markups. */
  serviceCosts: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  missingCosts: string[];
  lines: CostLine[];
  electrical?: ElectricalCostBreakdown;
  processing?: ProcessingCostBreakdown;
  financial?: FinancialSummary;
  meta: {
    calcWidthMm: number | null;
    calcHeightMm: number | null;
    glassAreaM2: number | null;
    glassRate: number | null;
    sandblastAreaM2: number | null;
  };
};

export const MATERIAL_SEED_KEYS = {
  glassRectangle: "oglinda-standard-dreptunghiulara",
  glassSpecial: "oglinda-forme-speciale",
  led: "banda-led",
  transformer: "transformator",
  touch: "senzor-touch",
  sandblast: "sablare",
} as const;

export const UNCONFIRMED_UOM = "neconfirmat";
