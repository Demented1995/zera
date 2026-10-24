import { resolveConfiguratorRules } from "@/modules/catalog/rules";
import type { ConfiguratorFeatureKey, ConfiguratorRulesV1, FeatureMode } from "@/modules/catalog/rules/types";
import { optionCatalogForFeature } from "@/modules/catalog/rules/option-catalog";
import { coerceConfiguratorState } from "@/modules/catalog/preview/view";
import { getGlassTypeById } from "@/modules/configurator/glass-types";
import {
  LED_STRIP_TYPES,
  LED_TEMPERATURES,
  LIGHTING_TYPES,
  SWITCH_TYPES,
} from "@/modules/configurator/lighting";
import {
  DEFOG_CONTROLS,
  DEFOG_SIZES,
  FRAME_TYPES,
  MOUNTING_TYPES,
} from "@/modules/configurator/processing";
import { getShapeById } from "@/modules/configurator/shapes";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";

export type PublicSpec = {
  id: string;
  label: string;
  value: string;
  /** Allowed customer options only. Hidden and disallowed values are omitted. */
  options: string | null;
  source: "configurator";
};

export type DescriptiveSpec = {
  id: string;
  label: string;
  value: string;
};

function modeOf(rules: ConfiguratorRulesV1, key: ConfiguratorFeatureKey): FeatureMode {
  return rules.features[key]?.mode ?? "FIXED";
}

function hidden(rules: ConfiguratorRulesV1, key: ConfiguratorFeatureKey): boolean {
  return modeOf(rules, key) === "HIDDEN";
}

function allowedOptions(
  rules: ConfiguratorRulesV1,
  feature: ConfiguratorFeatureKey,
): string | null {
  const rule = rules.features[feature];
  if (!rule || rule.mode !== "EDITABLE") {
    return null;
  }
  const allowed = new Set(rule.allowedValues ?? []);
  const labels = optionCatalogForFeature(feature)
    .filter((item) => allowed.has(item.id))
    .map((item) => item.label);
  if (labels.length === 0) {
    return null;
  }
  return `Opțiuni permise: ${labels.join(", ")}`;
}

function mm(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

function dimensionText(
  rules: ConfiguratorRulesV1,
  state: ConfiguratorState,
): PublicSpec | null {
  const widthHidden = hidden(rules, "width");
  const heightHidden = hidden(rules, "height");
  if (widthHidden && heightHidden) {
    return null;
  }

  function part(
    key: "width" | "height",
    current: number,
    rule: ConfiguratorRulesV1["dimensions"]["width"],
  ): string | null {
    if (hidden(rules, key)) {
      return null;
    }
    if (rule.mode !== "EDITABLE") {
      return `${mm(current)} mm`;
    }
    const bits = [`implicit ${mm(current)} mm`];
    if (rule.minMm != null) {
      bits.push(`minim ${mm(rule.minMm)} mm`);
    }
    if (rule.maxMm != null) {
      bits.push(`maxim ${mm(rule.maxMm)} mm`);
    }
    if (rule.stepMm != null) {
      bits.push(`pas ${mm(rule.stepMm)} mm`);
    }
    return bits.join(", ");
  }

  const width = part("width", state.widthMm, rules.dimensions.width);
  const height = part("height", state.heightMm, rules.dimensions.height);
  const value = [width ? `Lățime: ${width}` : null, height ? `Înălțime: ${height}` : null]
    .filter(Boolean)
    .join(". ");
  if (!value) {
    return null;
  }
  return {
    id: "dimensions",
    label: "Dimensiuni disponibile",
    value,
    options: null,
    source: "configurator",
  };
}

function labelOf<T extends string | number>(
  items: Array<{ id: T; label: string }>,
  id: T,
): string | null {
  return items.find((item) => item.id === id)?.label ?? null;
}

export function derivePublicSpecifications(input: {
  configJson?: unknown;
  rulesJson: unknown;
  /** Selected configuration. When present, it replaces the stored model default. */
  state?: ConfiguratorState | null;
}): PublicSpec[] {
  const state =
    input.state ??
    (input.configJson !== undefined ? coerceConfiguratorState(input.configJson) : null);
  if (!state) {
    return [];
  }
  const rules = resolveConfiguratorRules(input.rulesJson);
  const specs: PublicSpec[] = [];

  if (!hidden(rules, "shape")) {
    const shape = getShapeById(state.shapeId);
    specs.push({
      id: "shape",
      label: "Forma oglinzii",
      value: shape?.label ?? state.shapeId,
      options: allowedOptions(rules, "shape"),
      source: "configurator",
    });
  }

  const dimensions = dimensionText(rules, state);
  if (dimensions) {
    specs.push(dimensions);
  }

  if (!hidden(rules, "glassType")) {
    const glass = getGlassTypeById(state.glassTypeId);
    specs.push({
      id: "glass",
      label: "Tip sticlă",
      value: glass?.label ?? state.glassTypeId,
      options: allowedOptions(rules, "glassType"),
      source: "configurator",
    });
  }

  const frontHidden = hidden(rules, "frontLed");
  const backHidden = hidden(rules, "backLed");
  const lighting = state.lighting?.lightingType ?? "none";
  const showFront = lighting === "front" || lighting === "both";
  const showBack = lighting === "back" || lighting === "both";
  const lightingVisible =
    lighting === "none"
      ? !frontHidden || !backHidden
      : (showFront && !frontHidden) || (showBack && !backHidden);
  if (lightingVisible) {
    let value = labelOf(LIGHTING_TYPES, lighting) ?? lighting;
    if (lighting === "both" && frontHidden !== backHidden) {
      value = frontHidden ? "LED spate" : "LED față";
    }
    specs.push({
      id: "lighting",
      label: "Tip iluminare LED",
      value,
      options: null,
      source: "configurator",
    });
  }

  const ledActive = lighting === "front" || lighting === "back" || lighting === "both";
  if (ledActive && lightingVisible && !hidden(rules, "ledStripType")) {
    const ids = [
      showFront && !frontHidden ? state.lighting.front?.stripTypeId : null,
      showBack && !backHidden ? state.lighting.back?.stripTypeId : null,
    ].filter((id): id is NonNullable<typeof id> => Boolean(id));
    const unique = [...new Set(ids)];
    const labels = unique
      .map((id) => labelOf(LED_STRIP_TYPES, id))
      .filter((item): item is string => Boolean(item));
    if (labels.length > 0) {
      specs.push({
        id: "led-strip",
        label: "Bandă LED",
        value: labels.join(", "),
        options: allowedOptions(rules, "ledStripType"),
        source: "configurator",
      });
    }
  }

  if (ledActive && lightingVisible && !hidden(rules, "lightTemp")) {
    const temps = [
      showFront && !frontHidden ? state.lighting.front?.temperatureK : null,
      showBack && !backHidden ? state.lighting.back?.temperatureK : null,
    ].filter((id): id is NonNullable<typeof id> => id != null);
    const labels = [...new Set(temps)]
      .map((id) => labelOf(LED_TEMPERATURES, id))
      .filter((item): item is string => Boolean(item));
    if (labels.length > 0) {
      specs.push({
        id: "light-temp",
        label: "Temperatura luminii",
        value: labels.join(", "),
        options: allowedOptions(rules, "lightTemp"),
        source: "configurator",
      });
    }
  }

  if (ledActive && lightingVisible && !hidden(rules, "switchType")) {
    const switches = (state.lighting.switches ?? [])
      .map((item) => labelOf(SWITCH_TYPES, item.type))
      .filter((item): item is string => Boolean(item));
    if (switches.length > 0) {
      specs.push({
        id: "switch",
        label: "Tip întrerupător",
        value: switches.join(", "),
        options: allowedOptions(rules, "switchType"),
        source: "configurator",
      });
    }
  }

  if (!hidden(rules, "defog")) {
    if (!state.processing.defogEnabled) {
      specs.push({
        id: "defog",
        label: "Dezaburire",
        value: "Nu",
        options: allowedOptions(rules, "defog"),
        source: "configurator",
      });
    } else {
      const size = labelOf(DEFOG_SIZES, state.processing.defogSize);
      const control = labelOf(DEFOG_CONTROLS, state.processing.defogControl);
      specs.push({
        id: "defog",
        label: "Dezaburire",
        value: ["Da", size, control].filter(Boolean).join(", "),
        options: allowedOptions(rules, "defog"),
        source: "configurator",
      });
    }
  }

  if (!hidden(rules, "frames")) {
    const mounting = labelOf(MOUNTING_TYPES, state.processing.mountingType);
    const frame = labelOf(FRAME_TYPES, state.processing.frameType);
    const value = [mounting, frame && frame !== "Fără ramă" ? frame : null].filter(Boolean).join(", ");
    if (value) {
      specs.push({
        id: "mounting",
        label: "Montare",
        value,
        options: allowedOptions(rules, "frames"),
        source: "configurator",
      });
    }
  }

  return specs;
}

export function sanitizeExtraSpecs(raw: unknown): DescriptiveSpec[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const specs: DescriptiveSpec[] = [];
  for (const item of raw.slice(0, 30)) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const label = String((item as { label?: unknown }).label ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 80);
    const value = String((item as { value?: unknown }).value ?? "")
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300);
    const id = String((item as { id?: unknown }).id ?? "")
      .replace(/[^\w-]/g, "")
      .slice(0, 40);
    if (!label || !value) {
      continue;
    }
    specs.push({ id: id || `spec-${specs.length + 1}`, label, value });
  }
  return specs;
}
