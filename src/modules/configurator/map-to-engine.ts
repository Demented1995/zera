import {
  MATERIAL_SEED_KEYS,
  computeGlassArea,
  resolveCurvedEdgeAddsMm,
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
  buildCommercialLines,
  defaultCommercialConfig,
  type CommercialConfig,
} from "@/modules/configurator/commercial";
import {
  buildProcessingDetailedComponents,
  defaultProcessingConfig,
  type ProcessingConfig,
} from "@/modules/configurator/processing";
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
  processing: ProcessingConfig;
  commercial: CommercialConfig;
};

export type ConfiguratorQuote = {
  shape: ConfiguratorShape;
  glassType: ConfiguratorGlassType;
  widthMm: number;
  heightMm: number;
  lighting: LightingConfig;
  processing: ProcessingConfig;
  commercial: CommercialConfig;
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

  const curvedAdds =
    explicitCurvedEdgeAddsMm ??
    resolveCurvedEdgeAddsMm(curvedEdges, rules.curvedEdgeAddMm);

  const glassArea = computeGlassArea({
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    shape: shape.engineShape,
    curvedEdgeAdds: curvedAdds,
  });

  const shapeIsRectangular = shape.engineShape === "RECTANGLE";
  const lightingBuilt = buildLightingDetailedComponents({
    lighting: state.lighting,
    shapeIsRectangular,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
  });

  const processingBuilt = buildProcessingDetailedComponents({
    processing: state.processing,
    shapeIsRectangular,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    glassAreaM2: glassArea.areaM2,
  });

  const commercialBuilt = buildCommercialLines({
    commercial: state.commercial,
  });

  return {
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    shape: shape.engineShape,
    curvedEdges,
    explicitCurvedEdgeAddsMm,
    // Aggregated fields stay at 0 — LED/switches/transformers come via detailedComponents.
    components: { ledMeters: 0, transformerPcs: 0, touchPcs: 0 },
    detailedComponents: [
      ...lightingBuilt.detailedComponents,
      ...processingBuilt.detailedComponents,
    ],
    decorativeSandblastAreaM2: processingBuilt.decorativeSandblastAreaM2,
    laborLines: commercialBuilt.laborLines,
    packagingIncludedLines: commercialBuilt.packagingIncludedLines,
    serviceLines: commercialBuilt.serviceLines,
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
    processing: options.state.processing,
    commercial: options.state.commercial,
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
  const processing = options.state.processing ?? defaultProcessingConfig();
  const commercial = options.state.commercial ?? defaultCommercialConfig();
  const state: ConfiguratorState = {
    ...options.state,
    lighting,
    processing,
    commercial,
  };
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

  const curvedAdds =
    shape.edgeMode === "manual"
      ? state.manualEdgeAddsMm
      : resolveCurvedEdgeAddsMm(
          shape.edgeMode === "preset" && shape.presetEdges
            ? shape.presetEdges
            : { left: false, right: false, top: false, bottom: false },
          options.rules.curvedEdgeAddMm,
        );
  const glassPreview = computeGlassArea({
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    shape: shape.engineShape,
    curvedEdgeAdds: curvedAdds,
  });

  const processingBuilt = buildProcessingDetailedComponents({
    processing,
    shapeIsRectangular,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    glassAreaM2: glassPreview.areaM2,
  });
  blockers.push(...processingBuilt.blockers);

  const commercialBuilt = buildCommercialLines({ commercial });
  blockers.push(...commercialBuilt.blockers);

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
      processing,
      commercial,
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
    if (calculation.financial) {
      calculation.financial.sinecost = null;
      calculation.financial.wholesalePrice = null;
      calculation.financial.retailPrice = null;
      calculation.financial.offerWholesale = null;
      calculation.financial.offerRetail = null;
    }
  }

  const configBlockers = [
    ...lightingBuilt.blockers,
    ...processingBuilt.blockers,
    ...commercialBuilt.blockers,
  ];
  if (configBlockers.length > 0) {
    calculation.status = "INCOMPLETE";
    calculation.wholesalePrice = null;
    calculation.retailPrice = null;
    calculation.totalProductionCost = null;
    if (calculation.financial) {
      calculation.financial.sinecost = null;
      calculation.financial.wholesalePrice = null;
      calculation.financial.retailPrice = null;
      calculation.financial.offerWholesale = null;
      calculation.financial.offerRetail = null;
    }
    for (const blocker of configBlockers) {
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
    processing,
    commercial,
    ledSystems: lightingBuilt.ledSystems,
    blockers,
    calculation,
  };
}
