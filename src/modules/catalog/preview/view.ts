import { FEATURE_LABELS, optionCatalogForFeature } from "@/modules/catalog/rules/option-catalog";
import type {
  ConfiguratorFeatureKey,
  ConfiguratorRulesV1,
  CustomerConfigRequest,
  FeatureMode,
  ValidateCustomerConfigResult,
} from "@/modules/catalog/rules/types";
import { CONFIGURATOR_FEATURE_KEYS } from "@/modules/catalog/rules/types";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { getGlassTypeById } from "@/modules/configurator/glass-types";
import {
  LED_POSITIONINGS,
  LED_STRIP_TYPES,
  LED_TEMPERATURES,
  SWITCH_TYPES,
  defaultLightingConfig,
  lightingUsesBack,
  lightingUsesFront,
} from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import {
  CUTOUT_TYPES,
  DEFOG_CONTROLS,
  DEFOG_SIZES,
  FACET_SHAPES,
  FRAME_TYPES,
  PRODUCT_ACCESSORIES,
  SANDBLAST_FINISHES,
  defaultProcessingConfig,
} from "@/modules/configurator/processing";
import { getShapeById } from "@/modules/configurator/shapes";

import type {
  AdminPreviewDiagnostic,
  CustomerPreviewPayload,
  PreviewChoice,
  PreviewControl,
  PreviewSection,
} from "@/modules/catalog/preview/types";

const SECTION_TITLES: Record<string, string> = {
  dimensions: "Dimensiuni și formă",
  glass: "Sticlă",
  lighting: "Iluminare",
  comfort: "Întrerupător și dezaburire",
  processing: "Prelucrări",
  extras: "Ramă și accesorii",
};

const COMPATIBILITY_LABEL: Record<string, string> = {
  requires_lighting: "Necesită iluminare LED",
  requires_front_led: "Necesită LED față",
  requires_back_led: "Necesită LED spate",
  requires_defog: "Necesită dezaburire",
  forbidden_frame_shape: "Ramă incompatibilă cu forma",
};

type PreviewModel = CustomerPreviewPayload["model"];

type PriceSource = {
  status: "COMPLETE" | "INCOMPLETE";
  retailPrice: number | null;
  missingCosts?: string[];
} | null;

export function coerceConfiguratorState(raw: unknown): ConfiguratorState | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<ConfiguratorState>;
  if (typeof value.shapeId !== "string") {
    return null;
  }
  const widthMm = Number(value.widthMm);
  const heightMm = Number(value.heightMm);
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) {
    return null;
  }
  const lightingBase = defaultLightingConfig();
  const processingBase = defaultProcessingConfig();
  return {
    shapeId: value.shapeId,
    widthMm,
    heightMm,
    glassTypeId:
      typeof value.glassTypeId === "string" ? value.glassTypeId : "standard",
    manualEdgeAddsMm: {
      left: Number(value.manualEdgeAddsMm?.left ?? 0),
      right: Number(value.manualEdgeAddsMm?.right ?? 0),
      top: Number(value.manualEdgeAddsMm?.top ?? 0),
      bottom: Number(value.manualEdgeAddsMm?.bottom ?? 0),
    },
    lighting: {
      ...lightingBase,
      ...value.lighting,
      front: { ...lightingBase.front, ...value.lighting?.front },
      back: { ...lightingBase.back, ...value.lighting?.back },
      switches: value.lighting?.switches ?? lightingBase.switches,
      extraComponents:
        value.lighting?.extraComponents ?? lightingBase.extraComponents,
    },
    processing: {
      ...processingBase,
      ...value.processing,
      accessories: value.processing?.accessories ?? processingBase.accessories,
      branding: value.processing?.branding ?? processingBase.branding,
      cutouts: value.processing?.cutouts ?? processingBase.cutouts,
    },
    commercial: {
      ...defaultCommercialConfig(),
      ...value.commercial,
    },
  };
}

/** Drop costs for systems the validated configuration turned off. */
export function clearInactiveComponents(
  config: ConfiguratorState,
): ConfiguratorState {
  const next = structuredClone(config);
  const front = lightingUsesFront(next.lighting.lightingType);
  const back = lightingUsesBack(next.lighting.lightingType);
  if (!front && !back) {
    next.lighting.switches = [];
    return next;
  }
  next.lighting.switches = next.lighting.switches.filter((item) => {
    if (item.associatedSystem === "front") {
      return front;
    }
    if (item.associatedSystem === "back") {
      return back;
    }
    return true;
  });
  return next;
}

function featureMode(
  rules: ConfiguratorRulesV1,
  key: ConfiguratorFeatureKey,
): FeatureMode {
  return rules.features[key]?.mode ?? "FIXED";
}

function allowedValues(
  rules: ConfiguratorRulesV1,
  key: ConfiguratorFeatureKey,
): string[] {
  return rules.features[key]?.allowedValues ?? [];
}

function choicesFor(
  feature: ConfiguratorFeatureKey,
  allowed: string[],
): PreviewChoice[] {
  const permit = new Set(allowed);
  return optionCatalogForFeature(feature).filter((item) => permit.has(item.id));
}

function labelOf(options: Array<{ id: string; label: string }>, id: string): string {
  return options.find((item) => item.id === id)?.label ?? id;
}

function sectionsFrom(controls: PreviewControl[]): PreviewSection[] {
  const ids: string[] = [];
  for (const control of controls) {
    if (!ids.includes(control.section)) {
      ids.push(control.section);
    }
  }
  return ids.map((id) => ({ id, title: SECTION_TITLES[id] ?? id }));
}

export function buildPreviewControls(
  rules: ConfiguratorRulesV1,
  config: ConfiguratorState,
): PreviewControl[] {
  const controls: PreviewControl[] = [];
  const frontOn = lightingUsesFront(config.lighting.lightingType);
  const backOn = lightingUsesBack(config.lighting.lightingType);
  const ledOn = frontOn || backOn;

  const shapeMode = featureMode(rules, "shape");
  if (shapeMode === "FIXED") {
    controls.push({
      id: "shape",
      section: "dimensions",
      kind: "text",
      mode: "FIXED",
      label: "Formă",
      valueLabel: getShapeById(config.shapeId)?.label ?? config.shapeId,
    });
  } else if (shapeMode === "EDITABLE") {
    controls.push({
      id: "shape",
      section: "dimensions",
      kind: "select",
      mode: "EDITABLE",
      label: "Formă",
      field: "shapeId",
      value: config.shapeId,
      options: choicesFor("shape", allowedValues(rules, "shape")),
      numeric: false,
    });
  }

  for (const axis of ["width", "height"] as const) {
    const rule = rules.dimensions[axis];
    if (rule.mode === "HIDDEN") {
      continue;
    }
    controls.push({
      id: axis,
      section: "dimensions",
      kind: "dimension",
      mode: rule.mode === "EDITABLE" ? "EDITABLE" : "FIXED",
      label: axis === "width" ? "Lățime" : "Înălțime",
      field: axis === "width" ? "widthMm" : "heightMm",
      value: axis === "width" ? config.widthMm : config.heightMm,
      minMm: rule.minMm ?? null,
      maxMm: rule.maxMm ?? null,
      stepMm: rule.stepMm ?? null,
    });
  }

  const glassMode = featureMode(rules, "glassType");
  if (glassMode === "FIXED") {
    controls.push({
      id: "glassType",
      section: "glass",
      kind: "text",
      mode: "FIXED",
      label: "Tip sticlă",
      valueLabel: getGlassTypeById(config.glassTypeId)?.label ?? config.glassTypeId,
    });
  } else if (glassMode === "EDITABLE") {
    controls.push({
      id: "glassType",
      section: "glass",
      kind: "select",
      mode: "EDITABLE",
      label: "Tip sticlă",
      field: "glassTypeId",
      value: config.glassTypeId,
      options: choicesFor("glassType", allowedValues(rules, "glassType")),
      numeric: false,
    });
  }

  pushLightingControls(controls, rules, config, frontOn, backOn);

  const switchMode = featureMode(rules, "switchType");
  if (ledOn && switchMode !== "HIDDEN") {
    const current = config.lighting.switches[0];
    if (switchMode === "FIXED") {
      controls.push({
        id: "switchType",
        section: "comfort",
        kind: "text",
        mode: "FIXED",
        label: "Întrerupător",
        valueLabel: current
          ? labelOf(SWITCH_TYPES, current.type)
          : "Fără întrerupător",
      });
    } else {
      controls.push({
        id: "switchType",
        section: "comfort",
        kind: "select",
        mode: "EDITABLE",
        label: "Întrerupător",
        field: "switchType",
        value: current?.type ?? "",
        options: choicesFor("switchType", allowedValues(rules, "switchType")),
        numeric: false,
      });
    }
  }

  pushDefogControls(controls, rules, config);
  pushProcessingControls(controls, rules, config);
  pushFrameAndAccessoryControls(controls, rules, config);

  return controls;
}

function pushLightingControls(
  controls: PreviewControl[],
  rules: ConfiguratorRulesV1,
  config: ConfiguratorState,
  frontOn: boolean,
  backOn: boolean,
) {
  const frontMode = featureMode(rules, "frontLed");
  const backMode = featureMode(rules, "backLed");

  if (
    frontMode === "FIXED" &&
    backMode === "FIXED" &&
    !frontOn &&
    !backOn
  ) {
    controls.push({
      id: "lighting-off",
      section: "lighting",
      kind: "text",
      mode: "FIXED",
      label: "Iluminare LED",
      valueLabel: "Fără iluminare",
    });
  } else {
    pushLedToggle(controls, "frontLed", "LED față", "frontLedEnabled", frontMode, frontOn);
    pushLedToggle(controls, "backLed", "LED spate", "backLedEnabled", backMode, backOn);
  }

  if (frontOn) {
    pushLedDetails(controls, rules, "față", "front", config.lighting.front);
  }
  if (backOn) {
    pushLedDetails(controls, rules, "spate", "back", config.lighting.back);
  }
}

function pushLedToggle(
  controls: PreviewControl[],
  id: string,
  label: string,
  field: "frontLedEnabled" | "backLedEnabled",
  mode: FeatureMode,
  enabled: boolean,
) {
  if (mode === "HIDDEN") {
    return;
  }
  if (mode === "EDITABLE") {
    controls.push({
      id,
      section: "lighting",
      kind: "toggle",
      mode: "EDITABLE",
      label,
      field,
      value: enabled,
    });
    return;
  }
  if (enabled) {
    controls.push({
      id,
      section: "lighting",
      kind: "text",
      mode: "FIXED",
      label,
      valueLabel: "Inclus",
    });
  }
}

function pushLedDetails(
  controls: PreviewControl[],
  rules: ConfiguratorRulesV1,
  sideLabel: string,
  side: "front" | "back",
  system: ConfiguratorState["lighting"]["front"],
) {
  const positionMode = featureMode(rules, "ledPosition");
  const stripMode = featureMode(rules, "ledStripType");
  const tempMode = featureMode(rules, "lightTemp");
  const positionField = side === "front" ? "frontLedPositioning" : "backLedPositioning";
  const stripField = side === "front" ? "frontLedStripTypeId" : "backLedStripTypeId";
  const tempField = side === "front" ? "frontLightTempK" : "backLightTempK";

  if (positionMode === "FIXED") {
    controls.push({
      id: `${side}-position`,
      section: "lighting",
      kind: "text",
      mode: "FIXED",
      label: `Poziție LED ${sideLabel}`,
      valueLabel: labelOf(LED_POSITIONINGS, system.positioning),
    });
  } else if (positionMode === "EDITABLE") {
    controls.push({
      id: `${side}-position`,
      section: "lighting",
      kind: "select",
      mode: "EDITABLE",
      label: `Poziție LED ${sideLabel}`,
      field: positionField,
      value: system.positioning,
      options: choicesFor("ledPosition", allowedValues(rules, "ledPosition")),
      numeric: false,
    });
  }

  if (stripMode === "FIXED") {
    controls.push({
      id: `${side}-strip`,
      section: "lighting",
      kind: "text",
      mode: "FIXED",
      label: `Bandă LED ${sideLabel}`,
      valueLabel: labelOf(LED_STRIP_TYPES, system.stripTypeId),
    });
  } else if (stripMode === "EDITABLE") {
    controls.push({
      id: `${side}-strip`,
      section: "lighting",
      kind: "select",
      mode: "EDITABLE",
      label: `Bandă LED ${sideLabel}`,
      field: stripField,
      value: system.stripTypeId,
      options: choicesFor("ledStripType", allowedValues(rules, "ledStripType")),
      numeric: false,
    });
  }

  if (tempMode === "FIXED") {
    controls.push({
      id: `${side}-temp`,
      section: "lighting",
      kind: "text",
      mode: "FIXED",
      label: `Temperatură LED ${sideLabel}`,
      valueLabel: labelOf(
        LED_TEMPERATURES.map((item) => ({ id: String(item.id), label: item.label })),
        String(system.temperatureK),
      ),
    });
  } else if (tempMode === "EDITABLE") {
    controls.push({
      id: `${side}-temp`,
      section: "lighting",
      kind: "select",
      mode: "EDITABLE",
      label: `Temperatură LED ${sideLabel}`,
      field: tempField,
      value: String(system.temperatureK),
      options: choicesFor("lightTemp", allowedValues(rules, "lightTemp")),
      numeric: true,
    });
  }
}

function pushDefogControls(
  controls: PreviewControl[],
  rules: ConfiguratorRulesV1,
  config: ConfiguratorState,
) {
  const mode = featureMode(rules, "defog");
  if (mode === "HIDDEN") {
    return;
  }
  if (mode === "FIXED") {
    if (!config.processing.defogEnabled) {
      return;
    }
    controls.push({
      id: "defog",
      section: "comfort",
      kind: "text",
      mode: "FIXED",
      label: "Dezaburire",
      valueLabel: `${labelOf(DEFOG_SIZES, config.processing.defogSize)} · ${labelOf(DEFOG_CONTROLS, config.processing.defogControl)}`,
    });
    return;
  }

  controls.push({
    id: "defog",
    section: "comfort",
    kind: "toggle",
    mode: "EDITABLE",
    label: "Dezaburire",
    field: "defogEnabled",
    value: config.processing.defogEnabled,
  });
  if (!config.processing.defogEnabled) {
    return;
  }
  const allowed = allowedValues(rules, "defog");
  const sizes = choicesFor("defog", allowed).filter((item) =>
    item.id.startsWith("size:"),
  );
  const controlsChoices = choicesFor("defog", allowed).filter((item) =>
    item.id.startsWith("control:"),
  );
  if (sizes.length > 0) {
    controls.push({
      id: "defog-size",
      section: "comfort",
      kind: "select",
      mode: "EDITABLE",
      label: "Dimensiune dezaburire",
      field: "defogSize",
      value: config.processing.defogSize,
      options: sizes.map((item) => ({
        id: item.id.slice("size:".length),
        label: item.label,
      })),
      numeric: false,
    });
  }
  if (controlsChoices.length > 0) {
    controls.push({
      id: "defog-control",
      section: "comfort",
      kind: "select",
      mode: "EDITABLE",
      label: "Control dezaburire",
      field: "defogControl",
      value: config.processing.defogControl,
      options: controlsChoices.map((item) => ({
        id: item.id.slice("control:".length),
        label: item.label,
      })),
      numeric: false,
    });
  }
}

function pushProcessingControls(
  controls: PreviewControl[],
  rules: ConfiguratorRulesV1,
  config: ConfiguratorState,
) {
  const sandMode = featureMode(rules, "decorativeSandblast");
  if (sandMode === "FIXED" && config.processing.sandblastFinish !== "none") {
    controls.push({
      id: "sandblast",
      section: "processing",
      kind: "text",
      mode: "FIXED",
      label: "Sablare",
      valueLabel: labelOf(SANDBLAST_FINISHES, config.processing.sandblastFinish),
    });
  } else if (sandMode === "EDITABLE") {
    const options = choicesFor(
      "decorativeSandblast",
      allowedValues(rules, "decorativeSandblast"),
    );
    if (allowedValues(rules, "decorativeSandblast").includes("none")) {
      options.unshift({ id: "none", label: "Fără sablare decorativă" });
    }
    controls.push({
      id: "sandblast",
      section: "processing",
      kind: "select",
      mode: "EDITABLE",
      label: "Sablare",
      field: "sandblastFinish",
      value: config.processing.sandblastFinish,
      options,
      numeric: false,
    });
  }

  const facetMode = featureMode(rules, "facets");
  if (facetMode === "FIXED" && config.processing.facetEnabled) {
    const shape = labelOf(FACET_SHAPES, config.processing.facetShape);
    controls.push({
      id: "facets",
      section: "processing",
      kind: "text",
      mode: "FIXED",
      label: "Fațetă",
      valueLabel: `${shape}, ${config.processing.facetWidthMm} mm`,
    });
  } else if (facetMode === "EDITABLE") {
    controls.push({
      id: "facets",
      section: "processing",
      kind: "toggle",
      mode: "EDITABLE",
      label: "Fațetă",
      field: "facetEnabled",
      value: config.processing.facetEnabled,
    });
    if (config.processing.facetEnabled) {
      const allowed = allowedValues(rules, "facets");
      const shapes = choicesFor("facets", allowed).filter((item) =>
        item.id.startsWith("shape:"),
      );
      const widths = choicesFor("facets", allowed).filter((item) =>
        item.id.startsWith("width:"),
      );
      if (shapes.length > 0) {
        controls.push({
          id: "facet-shape",
          section: "processing",
          kind: "select",
          mode: "EDITABLE",
          label: "Formă fațetă",
          field: "facetShape",
          value: config.processing.facetShape,
          options: shapes.map((item) => ({
            id: item.id.slice("shape:".length),
            label: item.label,
          })),
          numeric: false,
        });
      }
      if (widths.length > 0) {
        controls.push({
          id: "facet-width",
          section: "processing",
          kind: "select",
          mode: "EDITABLE",
          label: "Lățime fațetă",
          field: "facetWidthMm",
          value: String(config.processing.facetWidthMm),
          options: widths.map((item) => ({
            id: item.id.slice("width:".length),
            label: item.label,
          })),
          numeric: true,
        });
      }
    }
  }

  const engravingMode = featureMode(rules, "engraving");
  if (engravingMode === "FIXED" && config.processing.engravingEnabled) {
    controls.push({
      id: "engraving",
      section: "processing",
      kind: "text",
      mode: "FIXED",
      label: "Gravură",
      valueLabel: "Inclusă",
    });
  } else if (engravingMode === "EDITABLE") {
    controls.push({
      id: "engraving",
      section: "processing",
      kind: "toggle",
      mode: "EDITABLE",
      label: "Gravură",
      field: "engravingEnabled",
      value: config.processing.engravingEnabled,
    });
  }

  const cutoutMode = featureMode(rules, "cutouts");
  if (cutoutMode === "FIXED" && config.processing.cutouts.length > 0) {
    controls.push({
      id: "cutouts",
      section: "processing",
      kind: "text",
      mode: "FIXED",
      label: "Decupaje",
      valueLabel: config.processing.cutouts
        .map((item) => `${labelOf(CUTOUT_TYPES, item.type)} × ${item.qty}`)
        .join(", "),
    });
  } else if (cutoutMode === "EDITABLE") {
    const options = choicesFor("cutouts", allowedValues(rules, "cutouts"));
    controls.push({
      id: "cutouts",
      section: "processing",
      kind: "quantities",
      mode: "EDITABLE",
      label: "Decupaje",
      field: "cutouts",
      lines: options.map((option) => ({
        type: option.id,
        label: option.label,
        qty:
          config.processing.cutouts.find((item) => item.type === option.id)?.qty ??
          0,
      })),
    });
  }
}

function pushFrameAndAccessoryControls(
  controls: PreviewControl[],
  rules: ConfiguratorRulesV1,
  config: ConfiguratorState,
) {
  const frameMode = featureMode(rules, "frames");
  if (frameMode === "FIXED" && config.processing.frameType !== "none") {
    controls.push({
      id: "frames",
      section: "extras",
      kind: "text",
      mode: "FIXED",
      label: "Ramă",
      valueLabel: labelOf(FRAME_TYPES, config.processing.frameType),
    });
  } else if (frameMode === "EDITABLE") {
    controls.push({
      id: "frames",
      section: "extras",
      kind: "select",
      mode: "EDITABLE",
      label: "Ramă",
      field: "frameType",
      value: config.processing.frameType,
      options: choicesFor("frames", allowedValues(rules, "frames")),
      numeric: false,
    });
  }

  const accessoryMode = featureMode(rules, "accessories");
  const enabledAccessories = config.processing.accessories.filter((item) => item.enabled);
  if (accessoryMode === "FIXED" && enabledAccessories.length > 0) {
    controls.push({
      id: "accessories",
      section: "extras",
      kind: "text",
      mode: "FIXED",
      label: "Accesorii",
      valueLabel: enabledAccessories
        .map((item) => labelOf(PRODUCT_ACCESSORIES, item.id))
        .join(", "),
    });
  } else if (accessoryMode === "EDITABLE") {
    controls.push({
      id: "accessories",
      section: "extras",
      kind: "checks",
      mode: "EDITABLE",
      label: "Accesorii",
      field: "accessoryIds",
      values: enabledAccessories.map((item) => item.id),
      options: choicesFor("accessories", allowedValues(rules, "accessories")),
    });
  }

  const logoMode = featureMode(rules, "logo");
  const enabledLogos = config.processing.branding.filter(
    (item) => item.enabled && item.id.startsWith("logo"),
  );
  if (logoMode === "FIXED" && enabledLogos.length > 0) {
    controls.push({
      id: "logo",
      section: "extras",
      kind: "text",
      mode: "FIXED",
      label: "Logo",
      valueLabel: enabledLogos.map((item) => item.id).join(", "),
    });
  } else if (logoMode === "EDITABLE") {
    controls.push({
      id: "logo",
      section: "extras",
      kind: "checks",
      mode: "EDITABLE",
      label: "Logo",
      field: "logoIds",
      values: enabledLogos.map((item) => item.id),
      options: choicesFor("logo", allowedValues(rules, "logo")),
    });
  }

  const filmMode = featureMode(rules, "antiShatterFilm");
  const filmOn =
    config.processing.branding.find((item) => item.id === "anti-shatter-film")
      ?.enabled ?? false;
  if (filmMode === "FIXED" && filmOn) {
    controls.push({
      id: "film",
      section: "extras",
      kind: "text",
      mode: "FIXED",
      label: "Folie anti-ciobire",
      valueLabel: "Inclusă",
    });
  } else if (filmMode === "EDITABLE") {
    controls.push({
      id: "film",
      section: "extras",
      kind: "toggle",
      mode: "EDITABLE",
      label: "Folie anti-ciobire",
      field: "antiShatterFilmEnabled",
      value: filmOn,
    });
  }
}

function sameIds(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

export function selectionFromStates(
  modelDefault: ConfiguratorState,
  config: ConfiguratorState,
): CustomerConfigRequest {
  const request: CustomerConfigRequest = {};
  if (config.shapeId !== modelDefault.shapeId) {
    request.shapeId = config.shapeId;
  }
  if (config.widthMm !== modelDefault.widthMm) {
    request.widthMm = config.widthMm;
  }
  if (config.heightMm !== modelDefault.heightMm) {
    request.heightMm = config.heightMm;
  }
  if (config.glassTypeId !== modelDefault.glassTypeId) {
    request.glassTypeId = config.glassTypeId;
  }

  const front = lightingUsesFront(config.lighting.lightingType);
  const back = lightingUsesBack(config.lighting.lightingType);
  const defaultFront = lightingUsesFront(modelDefault.lighting.lightingType);
  const defaultBack = lightingUsesBack(modelDefault.lighting.lightingType);
  if (front !== defaultFront) {
    request.frontLedEnabled = front;
  }
  if (back !== defaultBack) {
    request.backLedEnabled = back;
  }
  if (front && config.lighting.front.positioning !== modelDefault.lighting.front.positioning) {
    request.frontLedPositioning = config.lighting.front.positioning;
  }
  if (back && config.lighting.back.positioning !== modelDefault.lighting.back.positioning) {
    request.backLedPositioning = config.lighting.back.positioning;
  }
  if (front && config.lighting.front.stripTypeId !== modelDefault.lighting.front.stripTypeId) {
    request.frontLedStripTypeId = config.lighting.front.stripTypeId;
  }
  if (back && config.lighting.back.stripTypeId !== modelDefault.lighting.back.stripTypeId) {
    request.backLedStripTypeId = config.lighting.back.stripTypeId;
  }
  if (front && config.lighting.front.temperatureK !== modelDefault.lighting.front.temperatureK) {
    request.frontLightTempK = config.lighting.front.temperatureK;
  }
  if (back && config.lighting.back.temperatureK !== modelDefault.lighting.back.temperatureK) {
    request.backLightTempK = config.lighting.back.temperatureK;
  }

  const ledOn = front || back;
  const currentSwitch = config.lighting.switches[0];
  const defaultSwitch = modelDefault.lighting.switches[0];
  if (
    ledOn &&
    (currentSwitch?.type !== defaultSwitch?.type ||
      currentSwitch?.qty !== defaultSwitch?.qty)
  ) {
    if (currentSwitch) {
      request.switchType = currentSwitch.type;
      request.switchQty = currentSwitch.qty;
    }
  }

  if (config.processing.defogEnabled !== modelDefault.processing.defogEnabled) {
    request.defogEnabled = config.processing.defogEnabled;
  }
  if (
    config.processing.defogEnabled &&
    config.processing.defogSize !== modelDefault.processing.defogSize
  ) {
    request.defogSize = config.processing.defogSize;
  }
  if (
    config.processing.defogEnabled &&
    config.processing.defogControl !== modelDefault.processing.defogControl
  ) {
    request.defogControl = config.processing.defogControl;
  }
  if (config.processing.frameType !== modelDefault.processing.frameType) {
    request.frameType = config.processing.frameType;
  }
  if (config.processing.facetEnabled !== modelDefault.processing.facetEnabled) {
    request.facetEnabled = config.processing.facetEnabled;
  }
  if (
    config.processing.facetEnabled &&
    config.processing.facetShape !== modelDefault.processing.facetShape
  ) {
    request.facetShape = config.processing.facetShape;
  }
  if (
    config.processing.facetEnabled &&
    config.processing.facetWidthMm !== modelDefault.processing.facetWidthMm
  ) {
    request.facetWidthMm = config.processing.facetWidthMm;
  }
  if (config.processing.sandblastFinish !== modelDefault.processing.sandblastFinish) {
    request.sandblastFinish = config.processing.sandblastFinish;
  }
  if (config.processing.engravingEnabled !== modelDefault.processing.engravingEnabled) {
    request.engravingEnabled = config.processing.engravingEnabled;
  }

  const cutoutsNow = config.processing.cutouts.map((item) => ({
    type: item.type,
    qty: item.qty,
  }));
  const cutoutsDefault = modelDefault.processing.cutouts.map((item) => ({
    type: item.type,
    qty: item.qty,
  }));
  if (JSON.stringify(cutoutsNow) !== JSON.stringify(cutoutsDefault)) {
    request.cutouts = cutoutsNow;
  }

  const accessoriesNow = config.processing.accessories
    .filter((item) => item.enabled)
    .map((item) => item.id);
  const accessoriesDefault = modelDefault.processing.accessories
    .filter((item) => item.enabled)
    .map((item) => item.id);
  if (!sameIds(accessoriesNow, accessoriesDefault)) {
    request.accessoryIds = accessoriesNow;
  }

  const logosNow = config.processing.branding
    .filter((item) => item.enabled && item.id.startsWith("logo"))
    .map((item) => item.id);
  const logosDefault = modelDefault.processing.branding
    .filter((item) => item.enabled && item.id.startsWith("logo"))
    .map((item) => item.id);
  if (!sameIds(logosNow, logosDefault)) {
    request.logoIds = logosNow;
  }

  const filmNow =
    config.processing.branding.find((item) => item.id === "anti-shatter-film")
      ?.enabled ?? false;
  const filmDefault =
    modelDefault.processing.branding.find((item) => item.id === "anti-shatter-film")
      ?.enabled ?? false;
  if (filmNow !== filmDefault) {
    request.antiShatterFilmEnabled = filmNow;
  }

  return request;
}

function customerPrice(source: PriceSource): CustomerPreviewPayload["price"] {
  if (!source || source.status !== "COMPLETE" || source.retailPrice == null) {
    return {
      available: false,
      retailPrice: null,
      currency: "MDL",
      message: "Preț indisponibil momentan",
    };
  }
  return {
    available: true,
    retailPrice: source.retailPrice,
    currency: "MDL",
    message: null,
  };
}

function dimensionSnapshot(
  rule: ConfiguratorRulesV1["dimensions"]["width"],
): AdminPreviewDiagnostic["dimensions"]["width"] {
  return {
    mode: rule.mode,
    minMm: rule.minMm ?? null,
    maxMm: rule.maxMm ?? null,
    stepMm: rule.stepMm ?? null,
  };
}

export function assembleMirrorPreview(input: {
  model: PreviewModel;
  rules: ConfiguratorRulesV1;
  modelDefault: ConfiguratorState;
  validated: ValidateCustomerConfigResult;
  priceSource: PriceSource;
  blockers: string[];
  includeDiagnostic: boolean;
}): {
  customer: CustomerPreviewPayload;
  diagnostic: AdminPreviewDiagnostic | null;
} {
  const config = clearInactiveComponents(input.validated.config);
  const controls = buildPreviewControls(input.rules, config);
  const customer: CustomerPreviewPayload = {
    model: {
      id: input.model.id,
      name: input.model.name,
      code: input.model.code,
      shortDescription: input.model.shortDescription,
      fullDescription: input.model.fullDescription,
      status: input.model.status,
    },
    sections: sectionsFrom(controls),
    controls,
    selection: selectionFromStates(input.modelDefault, config),
    price: customerPrice(input.priceSource),
    notices: input.validated.rejected.map((issue) => issue.message),
  };

  const diagnostic: AdminPreviewDiagnostic | null = input.includeDiagnostic
    ? {
        calculationStatus: input.priceSource?.status ?? "UNAVAILABLE",
        missingCauses: [
          ...input.blockers,
          ...(input.priceSource?.missingCosts ?? []),
        ],
        features: CONFIGURATOR_FEATURE_KEYS.map((key) => ({
          key,
          label: FEATURE_LABELS[key],
          mode: featureMode(input.rules, key),
        })),
        dimensions: {
          width: dimensionSnapshot(input.rules.dimensions.width),
          height: dimensionSnapshot(input.rules.dimensions.height),
        },
        compatibility: input.rules.compatibility.map((rule) => ({
          id: rule.id,
          kind: COMPATIBILITY_LABEL[rule.kind] ?? rule.kind,
          detail: rule.frameTypeId
            ? `${rule.frameTypeId} → ${(rule.forbiddenShapeIds ?? []).join(", ")}`
            : "",
        })),
        rejected: input.validated.rejected.map((issue) => ({
          code: issue.code,
          message: issue.message,
        })),
        applied: input.validated.applied,
      }
    : null;

  return { customer, diagnostic };
}
