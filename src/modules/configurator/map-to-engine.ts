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
};

export type ConfiguratorQuote = {
  shape: ConfiguratorShape;
  glassType: ConfiguratorGlassType;
  widthMm: number;
  heightMm: number;
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
}): CalculationInput | { error: string } {
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

  return {
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    shape: shape.engineShape,
    curvedEdges,
    explicitCurvedEdgeAddsMm,
    components: { ledMeters: 0, transformerPcs: 0, touchPcs: 0 },
    decorativeSandblastAreaM2: 0,
    materials: applyGlassTypeToCatalog(materials, glassType),
    rules,
  };
}

export function quoteConfigurator(options: {
  state: ConfiguratorState;
  materials: CatalogMaterial[];
  rules: PricingRules;
}): ConfiguratorQuote {
  const shape = getShapeById(options.state.shapeId);
  const glassType = getGlassTypeById(options.state.glassTypeId);
  const blockers: string[] = [];

  if (!shape) {
    return {
      shape: {
        id: options.state.shapeId,
        label: "Necunoscută",
        description: "",
        engineShape: null,
        edgeMode: "unavailable",
      },
      glassType: glassType ?? {
        id: options.state.glassTypeId,
        label: "Necunoscut",
        hasConfirmedPricing: false,
      },
      widthMm: options.state.widthMm,
      heightMm: options.state.heightMm,
      blockers: ["Formă invalidă."],
      calculation: null,
    };
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
    return {
      shape,
      glassType: glassType!,
      widthMm: options.state.widthMm,
      heightMm: options.state.heightMm,
      blockers,
      calculation: null,
    };
  }

  const input = buildCalculationInput({
    state: options.state,
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
      widthMm: options.state.widthMm,
      heightMm: options.state.heightMm,
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

  return {
    shape,
    glassType: glassType!,
    widthMm: options.state.widthMm,
    heightMm: options.state.heightMm,
    blockers,
    calculation,
  };
}
