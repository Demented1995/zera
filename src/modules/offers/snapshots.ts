import type { CalculationResult } from "@/modules/pricing/engine";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { getShapeById } from "@/modules/configurator/shapes";
import { getGlassTypeById } from "@/modules/configurator/glass-types";
import {
  LIGHTING_TYPES,
  LED_POSITIONINGS,
  LED_STRIP_TYPES,
} from "@/modules/configurator/lighting";
import { lightingUsesBack, lightingUsesFront } from "@/modules/configurator/lighting";

/**
 * Customer-safe calculation excerpt — NEVER includes sinecost / internal cost lines.
 */
export function toPublicCalculation(
  calculation: CalculationResult | null,
  priceTier: "wholesale" | "retail",
): {
  status: string;
  unitPrice: number | null;
  wholesalePrice: number | null;
  retailPrice: number | null;
  servicesTotal: number | null;
  offerTotalHint: number | null;
  missingCosts: string[];
} {
  if (!calculation) {
    return {
      status: "INCOMPLETE",
      unitPrice: null,
      wholesalePrice: null,
      retailPrice: null,
      servicesTotal: null,
      offerTotalHint: null,
      missingCosts: ["Calcul indisponibil"],
    };
  }

  const unitPrice =
    priceTier === "wholesale"
      ? calculation.wholesalePrice
      : calculation.retailPrice;
  const servicesTotal = calculation.financial?.services.total ?? calculation.serviceCosts ?? 0;
  const offerTotalHint =
    unitPrice !== null && servicesTotal !== null
      ? Math.round((unitPrice + servicesTotal) * 100) / 100
      : null;

  return {
    status: calculation.status,
    unitPrice,
    wholesalePrice: calculation.wholesalePrice,
    retailPrice: calculation.retailPrice,
    servicesTotal,
    offerTotalHint,
    // Keep customer-facing blockers without internal cost language where possible
    missingCosts: calculation.missingCosts,
  };
}

export type OfferTechSummary = {
  shapeLabel: string;
  widthMm: number;
  heightMm: number;
  glassTypeLabel: string;
  lightingLabel: string;
  features: string[];
};

export function summarizeTechFeatures(state: ConfiguratorState): OfferTechSummary {
  const shape = getShapeById(state.shapeId);
  const glass = getGlassTypeById(state.glassTypeId);
  const lightingLabel =
    LIGHTING_TYPES.find((item) => item.id === state.lighting.lightingType)
      ?.label ?? state.lighting.lightingType;

  const features: string[] = [];
  if (lightingUsesFront(state.lighting.lightingType)) {
    const pos = LED_POSITIONINGS.find(
      (item) => item.id === state.lighting.front.positioning,
    )?.label;
    const strip = LED_STRIP_TYPES.find(
      (item) => item.id === state.lighting.front.stripTypeId,
    )?.label;
    features.push(
      `LED față: ${strip ?? "?"} · ${pos ?? "?"} · ${state.lighting.front.temperatureK}K`,
    );
  }
  if (lightingUsesBack(state.lighting.lightingType)) {
    const pos = LED_POSITIONINGS.find(
      (item) => item.id === state.lighting.back.positioning,
    )?.label;
    const strip = LED_STRIP_TYPES.find(
      (item) => item.id === state.lighting.back.stripTypeId,
    )?.label;
    features.push(
      `LED spate: ${strip ?? "?"} · ${pos ?? "?"} · ${state.lighting.back.temperatureK}K`,
    );
  }
  if (state.processing.sandblastFinish !== "none") {
    features.push(`Sablare: ${state.processing.sandblastFinish}`);
  }
  if (state.processing.facetEnabled) {
    features.push(
      `Fațetă ${state.processing.facetShape} ${state.processing.facetWidthMm} mm`,
    );
  }
  if (state.processing.defogEnabled) {
    features.push(`Dezaburire ${state.processing.defogSize}`);
  }
  if (state.processing.frameType !== "none") {
    features.push(`Ramă: ${state.processing.frameType}`);
  }
  if (state.commercial.deliveryType !== "pickup") {
    features.push(`Livrare: ${state.commercial.deliveryType}`);
  }
  if (state.commercial.installType !== "none") {
    features.push(`Montaj: ${state.commercial.installType}`);
  }

  return {
    shapeLabel: shape?.label ?? state.shapeId,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    glassTypeLabel: glass?.label ?? state.glassTypeId,
    lightingLabel,
    features,
  };
}

export type ImmutableOfferSnapshot = {
  offerNumber: string;
  revisionNumber: number;
  issuedAt: string;
  client: {
    name: string;
    phone: string;
    email: string | null;
    company: string | null;
    notes: string | null;
  };
  productName: string;
  quantity: number;
  priceTier: "wholesale" | "retail";
  unitPrice: number;
  servicesTotal: number;
  offerTotal: number;
  validityDays: number;
  validUntil: string | null;
  commercialNotes: string | null;
  tech: OfferTechSummary;
  publicCalculation: ReturnType<typeof toPublicCalculation>;
  company: {
    legalName: string | null;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    bankDetails: string | null;
  };
};

export function buildImmutableSnapshot(options: {
  offerNumber: string;
  revisionNumber: number;
  state: ConfiguratorState;
  calculation: CalculationResult;
  client: {
    name: string;
    phone: string;
    email?: string | null;
    company?: string | null;
    notes?: string | null;
  };
  productName: string;
  quantity: number;
  priceTier: "wholesale" | "retail";
  unitPrice: number;
  servicesTotal: number;
  offerTotal: number;
  validityDays: number;
  validUntil: Date | null;
  commercialNotes?: string | null;
  company: ImmutableOfferSnapshot["company"];
}): ImmutableOfferSnapshot {
  return {
    offerNumber: options.offerNumber,
    revisionNumber: options.revisionNumber,
    issuedAt: new Date().toISOString(),
    client: {
      name: options.client.name,
      phone: options.client.phone,
      email: options.client.email ?? null,
      company: options.client.company ?? null,
      notes: options.client.notes ?? null,
    },
    productName: options.productName,
    quantity: options.quantity,
    priceTier: options.priceTier,
    unitPrice: options.unitPrice,
    servicesTotal: options.servicesTotal,
    offerTotal: options.offerTotal,
    validityDays: options.validityDays,
    validUntil: options.validUntil?.toISOString() ?? null,
    commercialNotes: options.commercialNotes ?? null,
    tech: summarizeTechFeatures(options.state),
    publicCalculation: toPublicCalculation(options.calculation, options.priceTier),
    company: options.company,
  };
}
