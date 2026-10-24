import {
  MATERIAL_SEED_KEYS,
  type CalculationInput,
  type CalculationResult,
  type CatalogMaterial,
  type CurvedEdgeAddsMm,
  type PricingRules,
  calculateMirrorPricing,
} from "@/modules/pricing/engine";
import {
  getGlassTypeById,
  type ConfiguratorGlassType,
} from "@/modules/configurator/glass-types";
import {
  buildLightingDetailedComponents,
  defaultLightingConfig,
  type LedSystemResolved,
  type LightingConfig,
} from "@/modules/configurator/lighting";
import {
  getShapeById,
  type ConfiguratorShape,
} from "@/modules/configurator/shapes";

export type ConfiguratorState = {
  shapeId: string;
  widthMm: number;
  heightMm: number;
  glassTypeId: string;
  /** Manual mm adds — used when shape.edgeMode === "manual". */
  manualEdgeAddsMm: CurvedEdgeAddsMm;
  lighting: LightingConfig;
};

export type ConfiguratorQuote = {
  shape: ConfiguratorShape;
  glassType: ConfiguratorGlassType;
  widthMm: number;
  heightMm: number;
  lighting: LightingConfig;
  ledSystems: LedSystemResolved[];
  /** Human-readable blockers before/alongside engine (e.g. unconfirmed shape formula). */
  blockers: string[];
  calculation: CalculationResult | null;
};

function applyGlassTypeToCatalog(
  materials: CatalogMaterial[],
  glassType: ConfiguratorGlassType,
): CatalogMaterial[] {
  if (glassType.hasConfirmedPricing) {
    return materials;
  }

  // Never fall back to Standard rates for unconfigured glass types.
  return materials.map((material) => {
    if (
      material.seedKey === MATERIAL_SEED_KEYS.glassRectangle ||
      material.seedKey === MATERIAL_SEED_KEYS.glassSpecial
    ) {
      return {
        ...material,
        name: `Oglindă ${glassType.label}`,
        unitPrice: null,
      };
    }
    return material;
  });
}

export function buildCalculationInput(options: {
  state: ConfiguratorState;
  shape: ConfiguratorShape;
  glassType: ConfiguratorGlassType;
  materials: CatalogMaterial[];
  rules: PricingRules;
}): CalculationInput | { error: string; lightingBlockers?: string[] } {
  const { state, shape, glassType, materials, rules } = options;

  if (!shape.engineShape) {
    return {
      error:
        "Formula geometrică pentru această formă nu este încă confirmată. Selectați o formă cu reguli definite sau Personalizată cu adaosuri manuale.",
    };
  }

  let curvedEdges = {
    left: false,
    right: false,
    top: false,
    bottom: false,
  };
  let explicitCurvedEdgeAddsMm: CurvedEdgeAddsMm | undefined;

  if (shape.edgeMode === "preset" && shape.presetEdges) {
    curvedEdges = { ...shape.presetEdges };
  } else if (shape.edgeMode === "manual") {
    explicitCurvedEdgeAddsMm = { ...state.manualEdgeAddsMm };
  } else if (shape.edgeMode === "unavailable") {
    return {
      error: "Formula geometrică pentru această formă nu este încă confirmată.",
    };
  }

  const shapeIsRectangular = shape.engineShape === "RECTANGLE";
  const lightingBuilt = buildLightingDetailedComponents({
    lighting: state.lighting,
    shapeIsRectangular,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
  });

  return {
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    shape: shape.engineShape,
    curvedEdges,
    explicitCurvedEdgeAddsMm,
    // Aggregated fields stay at 0 — LED/switches/transformers come via detailedComponents.
    components: { ledMeters: 0, transformerPcs: 0, touchPcs: 0 },
    detailedComponents: lightingBuilt.detailedComponents,
    decorativeSandblastAreaM2: 0,
    materials: applyGlassTypeToCatalog(materials, glassType),
    rules,
  };
}

function emptyQuoteShell(options: {
  shape: ConfiguratorShape;
  glassType: ConfiguratorGlassType;
  state: ConfiguratorState;
  blockers: string[];
}): ConfiguratorQuote {
  return {
    shape: options.shape,
    glassType: options.glassType,
    widthMm: options.state.widthMm,
    heightMm: options.state.heightMm,
    lighting: options.state.lighting,
    ledSystems: [],
    blockers: options.blockers,
    calculation: null,
  };
}

export function quoteConfigurator(options: {
  state: ConfiguratorState;
  materials: CatalogMaterial[];
  rules: PricingRules;
}): ConfiguratorQuote {
  const lighting = options.state.lighting ?? defaultLightingConfig();
  const state: ConfiguratorState = { ...options.state, lighting };
  const shape = getShapeById(state.shapeId);
  const glassType = getGlassTypeById(state.glassTypeId);
  const blockers: string[] = [];

  if (!shape) {
    return emptyQuoteShell({
      shape: {
        id: state.shapeId,
        label: "Necunoscută",
        description: "",
        engineShape: null,
        edgeMode: "unavailable",
      },
      glassType: glassType ?? {
        id: state.glassTypeId,
        label: "Necunoscut",
        hasConfirmedPricing: false,
      },
      state,
      blockers: ["Formă invalidă."],
    });
  }

  if (!glassType) {
    blockers.push("Tip de sticlă invalid.");
  }

  if (glassType && !glassType.hasConfirmedPricing) {
    blockers.push(
      `Preț neconfigurat pentru sticla „${glassType.label}”. Nu se folosește tariful Standard.`,
    );
  }

  if (shape.engineShape === null || shape.edgeMode === "unavailable") {
    blockers.push(
      `Formula pentru forma „${shape.label}” nu este încă confirmată.`,
    );
    return emptyQuoteShell({
      shape,
      glassType: glassType!,
      state,
      blockers,
    });
  }

  const shapeIsRectangular = shape.engineShape === "RECTANGLE";
  const lightingBuilt = buildLightingDetailedComponents({
    lighting,
    shapeIsRectangular,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
  });
  blockers.push(...lightingBuilt.blockers);

  const input = buildCalculationInput({
    state,
    shape,
    glassType: glassType!,
    materials: options.materials,
    rules: options.rules,
  });

  if ("error" in input) {
    blockers.push(input.error);
    return {
      shape,
      glassType: glassType!,
      widthMm: state.widthMm,
      heightMm: state.heightMm,
      lighting,
      ledSystems: lightingBuilt.ledSystems,
      blockers,
      calculation: null,
    };
  }

  const calculation = calculateMirrorPricing(input);

  if (!glassType!.hasConfirmedPricing) {
    if (
      !calculation.missingCosts.some(
        (item) =>
          item.toLowerCase().includes("preț nesetat") ||
          item.toLowerCase().includes("preț neconfigurat"),
      )
    ) {
      calculation.missingCosts.push(
        `Sticlă ${glassType!.label}: Preț neconfigurat`,
      );
    }
    calculation.status = "INCOMPLETE";
    calculation.wholesalePrice = null;
    calculation.retailPrice = null;
    calculation.totalProductionCost = null;
  }

  // Lighting length / association blockers keep full pricing incomplete
  // even when LED unit prices exist.
  if (lightingBuilt.blockers.length > 0) {
    calculation.status = "INCOMPLETE";
    calculation.wholesalePrice = null;
    calculation.retailPrice = null;
    calculation.totalProductionCost = null;
    for (const blocker of lightingBuilt.blockers) {
      if (!calculation.missingCosts.includes(blocker)) {
        calculation.missingCosts.push(blocker);
      }
    }
  }

  return {
    shape,
    glassType: glassType!,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    lighting,
    ledSystems: lightingBuilt.ledSystems,
    blockers,
    calculation,
  };
}
