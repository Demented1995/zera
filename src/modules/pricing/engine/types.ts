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
  components: ComponentQuantities;
  /**
   * Decorative sandblast area in m² (separate from touch-symbol sandblast).
   * One minimum charge applies per decorative sandblast operation, not per band.
   */
  decorativeSandblastAreaM2: number;
  /**
   * Optional labor cost already configured elsewhere.
   * Null/undefined = not configured (not treated as 0).
   */
  laborCost?: number | null;
  /**
   * Delivery/install/commercial services — tracked separately;
   * markups are NOT auto-applied to these.
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

export type CalculationResult = {
  status: CalculationStatus;
  glassCost: number | null;
  componentCosts: number | null;
  operationCosts: number | null;
  laborCost: number | null;
  /** Production cost subject to wholesale/retail markups. */
  totalProductionCost: number | null;
  /** Services excluded from markups. */
  serviceCosts: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  missingCosts: string[];
  lines: CostLine[];
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
