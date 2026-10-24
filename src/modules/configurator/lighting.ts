import { MATERIAL_SEED_KEYS } from "@/modules/pricing/engine";
import {
  resolveLedLength,
  type LedLengthComputation,
  type LedPositioning,
} from "@/modules/pricing/engine/led-length";
import type { DetailedComponentLine } from "@/modules/pricing/engine/types";

export type LightingType = "none" | "front" | "back" | "both";

export type LedStripTypeId = "standard-15w" | "cob-10w";

export type LedTemperatureK = 3000 | 4000 | 6000;

export type SwitchTypeId = "mechanical" | "touch" | "motion";

export type ElectricalConnectionId = "direct-cable" | "plug";

export type ExtraComponentId =
  | "mounting-profile"
  | "plastic-frame"
  | "abs"
  | "electric-block-cover"
  | "lighting-block-cover"
  | "connectors"
  | "assembly"
  | "plexiglass-diffuser"
  | "aluminium-diffusion-profile";

export const LIGHTING_TYPES: Array<{ id: LightingType; label: string }> = [
  { id: "none", label: "Fără iluminare" },
  { id: "front", label: "LED față" },
  { id: "back", label: "LED spate" },
  { id: "both", label: "LED față + spate" },
];

export const LED_POSITIONINGS: Array<{
  id: LedPositioning;
  label: string;
}> = [
  { id: "one_width", label: "Un rând pe lățime (orizontal)" },
  { id: "two_width", label: "Două rânduri pe lățime" },
  { id: "one_height", label: "Un rând pe înălțime (vertical)" },
  { id: "two_height", label: "Două rânduri pe înălțime" },
  { id: "perimeter", label: "Perimetru" },
];

/**
 * Provisional commercial strip IDs.
 * Only Standard 15W is associated to the confirmed catalog LED price.
 * Do not assume W/m equals commercial label.
 */
export const LED_STRIP_TYPES: Array<{
  id: LedStripTypeId;
  label: string;
  materialSeedKey: string | null;
}> = [
  {
    id: "standard-15w",
    label: "Standard 15W",
    materialSeedKey: MATERIAL_SEED_KEYS.led,
  },
  {
    id: "cob-10w",
    label: "COB 10W",
    materialSeedKey: null,
  },
];

export const LED_TEMPERATURES: Array<{ id: LedTemperatureK; label: string }> = [
  { id: 3000, label: "3000K" },
  { id: 4000, label: "4000K" },
  { id: 6000, label: "6000K" },
];

export const SWITCH_TYPES: Array<{
  id: SwitchTypeId;
  label: string;
  materialSeedKey: string | null;
  note?: string;
}> = [
  { id: "mechanical", label: "Mecanic", materialSeedKey: null },
  {
    id: "touch",
    label: "Touch",
    materialSeedKey: MATERIAL_SEED_KEYS.touch,
    note: "Include sablarea simbolului; nu se adaugă sablare separată.",
  },
  { id: "motion", label: "Senzor mișcare", materialSeedKey: null },
];

export const ELECTRICAL_CONNECTIONS: Array<{
  id: ElectricalConnectionId;
  label: string;
}> = [
  { id: "direct-cable", label: "Cablu direct" },
  { id: "plug", label: "Ștecher" },
];

export const EXTRA_COMPONENTS: Array<{
  id: ExtraComponentId;
  label: string;
  /** No auto material/qty until admin defines associations. */
  materialSeedKey: string | null;
  defaultQty: number;
}> = [
  { id: "mounting-profile", label: "Profil de montaj", materialSeedKey: null, defaultQty: 0 },
  { id: "plastic-frame", label: "Ramă plastic", materialSeedKey: null, defaultQty: 0 },
  { id: "abs", label: "ABS", materialSeedKey: null, defaultQty: 0 },
  {
    id: "electric-block-cover",
    label: "Capac bloc electric",
    materialSeedKey: null,
    defaultQty: 0,
  },
  {
    id: "lighting-block-cover",
    label: "Capac bloc iluminare",
    materialSeedKey: null,
    defaultQty: 0,
  },
  { id: "connectors", label: "Conectori", materialSeedKey: null, defaultQty: 0 },
  { id: "assembly", label: "Ansamblu", materialSeedKey: null, defaultQty: 0 },
  {
    id: "plexiglass-diffuser",
    label: "Difuzor plexiglas",
    materialSeedKey: null,
    defaultQty: 0,
  },
  {
    id: "aluminium-diffusion-profile",
    label: "Profil aluminiu difuzie",
    materialSeedKey: null,
    defaultQty: 0,
  },
];

export type LedSystemConfig = {
  positioning: LedPositioning;
  stripTypeId: LedStripTypeId;
  temperatureK: LedTemperatureK;
  /** Manual base length mm (before 10%). */
  manualBaseLengthMm: number | null;
  useManualOverride: boolean;
  manualOverrideReason: string;
};

export type SwitchConfig = {
  type: SwitchTypeId;
  qty: number;
  /** Association to LED systems — never auto-assumed for front+back. */
  associatedSystem: "front" | "back" | "shared";
};

export type ExtraComponentConfig = {
  id: ExtraComponentId;
  enabled: boolean;
  qty: number;
  side: "front" | "back" | "shared";
};

export type LightingConfig = {
  lightingType: LightingType;
  front: LedSystemConfig;
  back: LedSystemConfig;
  switches: SwitchConfig[];
  /** Explicit transformer count only — not derived from size/power. */
  transformerPcs: number;
  electricalConnection: ElectricalConnectionId;
  extraComponents: ExtraComponentConfig[];
};

export function defaultLedSystem(): LedSystemConfig {
  return {
    positioning: "two_height",
    stripTypeId: "standard-15w",
    temperatureK: 4000,
    manualBaseLengthMm: null,
    useManualOverride: false,
    manualOverrideReason: "",
  };
}

export function defaultLightingConfig(): LightingConfig {
  return {
    lightingType: "none",
    front: defaultLedSystem(),
    back: defaultLedSystem(),
    switches: [],
    transformerPcs: 0,
    electricalConnection: "direct-cable",
    extraComponents: EXTRA_COMPONENTS.map((item) => ({
      id: item.id,
      enabled: false,
      qty: item.defaultQty,
      side: "shared",
    })),
  };
}

export function lightingUsesFront(type: LightingType): boolean {
  return type === "front" || type === "both";
}

export function lightingUsesBack(type: LightingType): boolean {
  return type === "back" || type === "both";
}

export function getStripType(id: LedStripTypeId) {
  return LED_STRIP_TYPES.find((item) => item.id === id)!;
}

export function getSwitchType(id: SwitchTypeId) {
  return SWITCH_TYPES.find((item) => item.id === id)!;
}

export type LedSystemResolved = {
  side: "front" | "back";
  stripTypeId: LedStripTypeId;
  temperatureK: LedTemperatureK;
  positioning: LedPositioning;
  length: LedLengthComputation | null;
  lengthError: string | null;
  seedKey: string | null;
  overrideHighlight: boolean;
  overrideReason: string;
};

export function resolveLedSystem(options: {
  side: "front" | "back";
  system: LedSystemConfig;
  shapeIsRectangular: boolean;
  widthMm: number;
  heightMm: number;
}): LedSystemResolved {
  const strip = getStripType(options.system.stripTypeId);
  const resolved = resolveLedLength({
    shapeIsRectangular: options.shapeIsRectangular,
    widthMm: options.widthMm,
    heightMm: options.heightMm,
    positioning: options.system.positioning,
    manualBaseLengthMm: options.system.manualBaseLengthMm,
    useManualOverride: options.system.useManualOverride,
  });

  const lengthError =
    "error" in resolved
      ? resolved.error
      : options.system.useManualOverride &&
          !options.system.manualOverrideReason.trim()
        ? "Motiv obligatoriu pentru lungimea LED modificată manual."
        : null;

  return {
    side: options.side,
    stripTypeId: options.system.stripTypeId,
    temperatureK: options.system.temperatureK,
    positioning: options.system.positioning,
    length: "error" in resolved ? null : resolved,
    lengthError,
    seedKey: strip.materialSeedKey,
    overrideHighlight: options.system.useManualOverride,
    overrideReason: options.system.manualOverrideReason,
  };
}

/**
 * Build detailed engine component lines from lighting config.
 * Sets simple components.ledMeters/touchPcs/transformerPcs to 0 when
 * using these lines — caller must zero the aggregated fields.
 */
export function buildLightingDetailedComponents(options: {
  lighting: LightingConfig;
  shapeIsRectangular: boolean;
  widthMm: number;
  heightMm: number;
}): {
  detailedComponents: DetailedComponentLine[];
  ledSystems: LedSystemResolved[];
  blockers: string[];
} {
  const { lighting, shapeIsRectangular, widthMm, heightMm } = options;
  const detailedComponents: DetailedComponentLine[] = [];
  const ledSystems: LedSystemResolved[] = [];
  const blockers: string[] = [];

  if (lighting.lightingType === "none") {
    return { detailedComponents, ledSystems, blockers };
  }

  const sides: Array<"front" | "back"> = [];
  if (lightingUsesFront(lighting.lightingType)) {
    sides.push("front");
  }
  if (lightingUsesBack(lighting.lightingType)) {
    sides.push("back");
  }

  for (const side of sides) {
    const system = side === "front" ? lighting.front : lighting.back;
    const resolved = resolveLedSystem({
      side,
      system,
      shapeIsRectangular,
      widthMm,
      heightMm,
    });
    ledSystems.push(resolved);

    const sideLabel = side === "front" ? "față" : "spate";
    const strip = getStripType(system.stripTypeId);

    if (resolved.lengthError) {
      blockers.push(`LED ${sideLabel}: ${resolved.lengthError}`);
    }

    if (!resolved.seedKey) {
      blockers.push(
        `LED ${sideLabel}: tip bandă „${strip.label}” fără preț asociat în catalog`,
      );
    }

    if (resolved.length) {
      const noteParts = [
        `Poziționare: ${LED_POSITIONINGS.find((p) => p.id === system.positioning)?.label ?? system.positioning}`,
        `Bază ${resolved.length.baseLengthM.toFixed(2)} m + 10% (${resolved.length.supplementM.toFixed(2)} m) = ${resolved.length.totalLengthM.toFixed(2)} m`,
        `${system.temperatureK}K`,
        `Sursă: ${resolved.length.source}`,
      ];
      if (resolved.overrideHighlight) {
        noteParts.push(
          `OVERRIDE ADMIN: ${resolved.overrideReason || "fără motiv"}`,
        );
      }
      if (resolved.length.note) {
        noteParts.push(resolved.length.note);
      }

      detailedComponents.push({
        key: `led-${side}`,
        label: `Bandă LED ${sideLabel} (${strip.label})`,
        seedKey: resolved.seedKey,
        quantity: resolved.length.totalLengthM,
        unit: "metru",
        group: side === "front" ? "led-front" : "led-back",
        note: noteParts.join(" · "),
        required: true,
      });
    } else if (resolved.seedKey === null || resolved.lengthError) {
      // Still surface an incomplete required line so missing costs stay visible.
      detailedComponents.push({
        key: `led-${side}`,
        label: `Bandă LED ${sideLabel} (${strip.label})`,
        seedKey: resolved.seedKey,
        quantity: 0,
        unit: "metru",
        group: side === "front" ? "led-front" : "led-back",
        note: resolved.lengthError ?? "Lungime LED de confirmat",
        required: true,
      });
    }
  }

  lighting.switches.forEach((sw, index) => {
    if (sw.qty <= 0) {
      return;
    }
    const meta = getSwitchType(sw.type);
    const assoc =
      sw.associatedSystem === "front"
        ? "față"
        : sw.associatedSystem === "back"
          ? "spate"
          : "comun";
    detailedComponents.push({
      key: `switch-${index}-${sw.type}`,
      label: `Întrerupător ${meta.label} (${assoc})`,
      seedKey: meta.materialSeedKey,
      quantity: sw.qty,
      unit: "bucată",
      group: "switch",
      note: meta.note,
      required: true,
    });
    if (!meta.materialSeedKey) {
      blockers.push(
        `Întrerupător ${meta.label}: Preț neconfigurat (fără material asociat)`,
      );
    }
  });

  if (lighting.transformerPcs > 0) {
    detailedComponents.push({
      key: "transformer",
      label: "Transformator",
      seedKey: MATERIAL_SEED_KEYS.transformer,
      quantity: lighting.transformerPcs,
      unit: "bucată",
      group: "transformer",
      required: true,
    });
  }

  for (const extra of lighting.extraComponents) {
    if (!extra.enabled || extra.qty <= 0) {
      continue;
    }
    const meta = EXTRA_COMPONENTS.find((item) => item.id === extra.id);
    const sideLabel =
      extra.side === "front"
        ? "față"
        : extra.side === "back"
          ? "spate"
          : "comun";
    detailedComponents.push({
      key: `extra-${extra.id}-${extra.side}`,
      label: `${meta?.label ?? extra.id} (${sideLabel})`,
      seedKey: meta?.materialSeedKey ?? null,
      quantity: extra.qty,
      unit: "bucată",
      group: "accessory",
      required: true,
    });
    if (!meta?.materialSeedKey) {
      blockers.push(
        `${meta?.label ?? extra.id}: Preț neconfigurat (fără material asociat)`,
      );
    }
  }

  // Connection is saved on config only; no auto catalog cost until associated.
  return { detailedComponents, ledSystems, blockers };
}
