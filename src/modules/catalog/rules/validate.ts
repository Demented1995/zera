import { resolveConfiguratorRules } from "@/modules/catalog/rules/defaults";
import type {
  CompatibilityRule,
  ConfiguratorFeatureKey,
  ConfiguratorRulesV1,
  CustomerConfigRequest,
  ValidateCustomerConfigResult,
  ValidationIssue,
} from "@/modules/catalog/rules/types";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import {
  defaultLightingConfig,
  type LightingType,
} from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import {
  defaultCommercialConfig,
} from "@/modules/configurator/commercial";

function cloneState(state: ConfiguratorState): ConfiguratorState {
  return structuredClone(state);
}

function nearlyMultiple(value: number, min: number, step: number): boolean {
  if (!(step > 0)) {
    return true;
  }
  const n = (value - min) / step;
  return Math.abs(n - Math.round(n)) < 1e-6;
}

function lightingHasLed(type: LightingType): boolean {
  return type === "front" || type === "back" || type === "both";
}

function lightingHasFront(type: LightingType): boolean {
  return type === "front" || type === "both";
}

function lightingHasBack(type: LightingType): boolean {
  return type === "back" || type === "both";
}

function setLightingType(
  current: LightingType,
  front: boolean,
  back: boolean,
): LightingType {
  if (front && back) {
    return "both";
  }
  if (front) {
    return "front";
  }
  if (back) {
    return "back";
  }
  return "none";
}

function modeAllowsChange(
  rules: ConfiguratorRulesV1,
  feature: ConfiguratorFeatureKey,
): boolean {
  return rules.features[feature]?.mode === "EDITABLE";
}

function rejectFixedOrHidden(
  rules: ConfiguratorRulesV1,
  feature: ConfiguratorFeatureKey,
  issues: ValidationIssue[],
  label: string,
): boolean {
  const mode = rules.features[feature]?.mode ?? "FIXED";
  if (mode === "EDITABLE") {
    return false;
  }
  issues.push({
    code: mode === "HIDDEN" ? "hidden_change" : "fixed_change",
    feature,
    message: `Câmpul „${label}” este ${mode === "HIDDEN" ? "ascuns" : "fix"} — modificarea este respinsă.`,
  });
  return true;
}

function assertAllowed(
  rules: ConfiguratorRulesV1,
  feature: ConfiguratorFeatureKey,
  value: string,
  issues: ValidationIssue[],
  label: string,
): boolean {
  const allowed = rules.features[feature]?.allowedValues ?? [];
  if (allowed.length === 0 || !allowed.includes(value)) {
    issues.push({
      code: "disallowed_option",
      feature,
      message: `Valoarea „${value}” nu este permisă pentru ${label}.`,
    });
    return false;
  }
  return true;
}

function validateDimension(
  value: number,
  rule: ConfiguratorRulesV1["dimensions"]["width"],
  feature: "width" | "height",
  issues: ValidationIssue[],
): boolean {
  if (!Number.isFinite(value) || value <= 0) {
    issues.push({
      code: "invalid_dimension",
      feature,
      message: "Dimensiunea trebuie să fie un număr pozitiv.",
    });
    return false;
  }
  const min = rule.minMm;
  const max = rule.maxMm;
  if (min != null && value < min) {
    issues.push({
      code: "out_of_limits",
      feature,
      message: `Valoarea ${value} mm este sub minimul ${min} mm.`,
    });
    return false;
  }
  if (max != null && value > max) {
    issues.push({
      code: "out_of_limits",
      feature,
      message: `Valoarea ${value} mm depășește maximul ${max} mm.`,
    });
    return false;
  }
  const step = rule.stepMm;
  const base = min ?? 0;
  if (step != null && step > 0 && !nearlyMultiple(value, base, step)) {
    issues.push({
      code: "invalid_step",
      feature,
      message: `Valoarea ${value} mm nu respectă pasul de ${step} mm.`,
    });
    return false;
  }
  return true;
}

function checkCompatibility(
  rules: CompatibilityRule[],
  config: ConfiguratorState,
  request: CustomerConfigRequest,
  issues: ValidationIssue[],
): void {
  const hasLed = lightingHasLed(config.lighting.lightingType);
  const hasFront = lightingHasFront(config.lighting.lightingType);
  const hasBack = lightingHasBack(config.lighting.lightingType);

  for (const rule of rules) {
    if (rule.kind === "requires_lighting" && !hasLed) {
      if (
        request.frontLightTempK != null ||
        request.backLightTempK != null ||
        request.frontLedPositioning != null ||
        request.backLedPositioning != null ||
        request.frontLedStripTypeId != null ||
        request.backLedStripTypeId != null ||
        request.switchType != null
      ) {
        issues.push({
          code: "incompatible",
          feature: "compatibility",
          message:
            "Opțiunile LED (temperatură / poziție / bandă / switch) nu pot fi active fără iluminare.",
        });
      }
    }
    if (rule.kind === "requires_front_led" && !hasFront) {
      if (
        request.frontLedPositioning != null ||
        request.frontLedStripTypeId != null ||
        request.frontLightTempK != null
      ) {
        issues.push({
          code: "incompatible",
          feature: "compatibility",
          message: "Opțiunile LED față necesită LED față activ.",
        });
      }
    }
    if (rule.kind === "requires_back_led" && !hasBack) {
      if (
        request.backLedPositioning != null ||
        request.backLedStripTypeId != null ||
        request.backLightTempK != null
      ) {
        issues.push({
          code: "incompatible",
          feature: "compatibility",
          message: "Opțiunile LED spate necesită LED spate activ.",
        });
      }
    }
    if (rule.kind === "requires_defog" && !config.processing.defogEnabled) {
      if (request.defogControl != null || request.defogSize != null) {
        issues.push({
          code: "incompatible",
          feature: "compatibility",
          message: "Controlul / dimensiunea dezaburirii necesită dezaburire activă.",
        });
      }
    }
    if (rule.kind === "forbidden_frame_shape" && rule.frameTypeId) {
      if (
        config.processing.frameType === rule.frameTypeId &&
        rule.forbiddenShapeIds?.includes(config.shapeId)
      ) {
        issues.push({
          code: "incompatible",
          feature: "compatibility",
          message: `Combinația ramă „${rule.frameTypeId}” + formă „${config.shapeId}” este interzisă.`,
        });
      }
    }
  }
}

/**
 * Server validation service for future customer configurator.
 * Starts from model defaults → applies only allowed changes → validates → returns config.
 * Never trusts React control hiding alone.
 */
export function validateCustomerConfig(input: {
  modelDefault: ConfiguratorState;
  rules?: unknown | null;
  request: CustomerConfigRequest;
}): ValidateCustomerConfigResult {
  const rules = resolveConfiguratorRules(input.rules);
  const config = cloneState(input.modelDefault);
  // Ensure nested defaults exist
  config.lighting = {
    ...defaultLightingConfig(),
    ...config.lighting,
    front: { ...defaultLightingConfig().front, ...config.lighting?.front },
    back: { ...defaultLightingConfig().back, ...config.lighting?.back },
  };
  config.processing = {
    ...defaultProcessingConfig(),
    ...config.processing,
  };
  config.commercial = {
    ...defaultCommercialConfig(),
    ...config.commercial,
  };

  const issues: ValidationIssue[] = [];
  const applied: string[] = [];
  const request = input.request;

  // Shape
  if (request.shapeId !== undefined && request.shapeId !== config.shapeId) {
    if (!rejectFixedOrHidden(rules, "shape", issues, "formă")) {
      if (assertAllowed(rules, "shape", request.shapeId, issues, "formă")) {
        config.shapeId = request.shapeId;
        applied.push("shape");
      }
    }
  }

  // Width
  if (request.widthMm !== undefined && request.widthMm !== config.widthMm) {
    const dimMode = rules.dimensions.width.mode;
    if (dimMode !== "EDITABLE") {
      issues.push({
        code: dimMode === "HIDDEN" ? "hidden_change" : "fixed_change",
        feature: "width",
        message: "Lățimea este fixă / ascunsă — modificarea este respinsă.",
      });
    } else if (
      validateDimension(request.widthMm, rules.dimensions.width, "width", issues)
    ) {
      config.widthMm = request.widthMm;
      applied.push("width");
    }
  }

  // Height
  if (request.heightMm !== undefined && request.heightMm !== config.heightMm) {
    const dimMode = rules.dimensions.height.mode;
    if (dimMode !== "EDITABLE") {
      issues.push({
        code: dimMode === "HIDDEN" ? "hidden_change" : "fixed_change",
        feature: "height",
        message: "Înălțimea este fixă / ascunsă — modificarea este respinsă.",
      });
    } else if (
      validateDimension(
        request.heightMm,
        rules.dimensions.height,
        "height",
        issues,
      )
    ) {
      config.heightMm = request.heightMm;
      applied.push("height");
    }
  }

  // Glass
  if (
    request.glassTypeId !== undefined &&
    request.glassTypeId !== config.glassTypeId
  ) {
    if (!rejectFixedOrHidden(rules, "glassType", issues, "tip sticlă")) {
      if (
        assertAllowed(
          rules,
          "glassType",
          request.glassTypeId,
          issues,
          "tip sticlă",
        )
      ) {
        config.glassTypeId = request.glassTypeId;
        applied.push("glassType");
      }
    }
  }

  // Front / back LED enable
  let frontEnabled = lightingHasFront(config.lighting.lightingType);
  let backEnabled = lightingHasBack(config.lighting.lightingType);

  if (request.frontLedEnabled !== undefined) {
    if (request.frontLedEnabled !== frontEnabled) {
      if (!rejectFixedOrHidden(rules, "frontLed", issues, "LED față")) {
        if (
          request.frontLedEnabled &&
          !assertAllowed(rules, "frontLed", "enabled", issues, "LED față")
        ) {
          // reject enable without allowed "enabled"
        } else {
          frontEnabled = request.frontLedEnabled;
          applied.push("frontLed");
        }
      }
    }
  }
  if (request.backLedEnabled !== undefined) {
    if (request.backLedEnabled !== backEnabled) {
      if (!rejectFixedOrHidden(rules, "backLed", issues, "LED spate")) {
        if (
          request.backLedEnabled &&
          !assertAllowed(rules, "backLed", "enabled", issues, "LED spate")
        ) {
          // reject
        } else {
          backEnabled = request.backLedEnabled;
          applied.push("backLed");
        }
      }
    }
  }
  config.lighting.lightingType = setLightingType(
    config.lighting.lightingType,
    frontEnabled,
    backEnabled,
  );

  // LED position / strip / temp
  if (request.frontLedPositioning !== undefined) {
    if (!rejectFixedOrHidden(rules, "ledPosition", issues, "poziție LED")) {
      if (
        assertAllowed(
          rules,
          "ledPosition",
          request.frontLedPositioning,
          issues,
          "poziție LED",
        )
      ) {
        config.lighting.front.positioning =
          request.frontLedPositioning as typeof config.lighting.front.positioning;
        applied.push("ledPosition:front");
      }
    }
  }
  if (request.backLedPositioning !== undefined) {
    if (!rejectFixedOrHidden(rules, "ledPosition", issues, "poziție LED")) {
      if (
        assertAllowed(
          rules,
          "ledPosition",
          request.backLedPositioning,
          issues,
          "poziție LED",
        )
      ) {
        config.lighting.back.positioning =
          request.backLedPositioning as typeof config.lighting.back.positioning;
        applied.push("ledPosition:back");
      }
    }
  }
  if (request.frontLedStripTypeId !== undefined) {
    if (!rejectFixedOrHidden(rules, "ledStripType", issues, "tip bandă LED")) {
      if (
        assertAllowed(
          rules,
          "ledStripType",
          request.frontLedStripTypeId,
          issues,
          "tip bandă LED",
        )
      ) {
        config.lighting.front.stripTypeId =
          request.frontLedStripTypeId as typeof config.lighting.front.stripTypeId;
        applied.push("ledStripType:front");
      }
    }
  }
  if (request.backLedStripTypeId !== undefined) {
    if (!rejectFixedOrHidden(rules, "ledStripType", issues, "tip bandă LED")) {
      if (
        assertAllowed(
          rules,
          "ledStripType",
          request.backLedStripTypeId,
          issues,
          "tip bandă LED",
        )
      ) {
        config.lighting.back.stripTypeId =
          request.backLedStripTypeId as typeof config.lighting.back.stripTypeId;
        applied.push("ledStripType:back");
      }
    }
  }
  if (request.frontLightTempK !== undefined) {
    if (!rejectFixedOrHidden(rules, "lightTemp", issues, "temperatură lumină")) {
      if (
        assertAllowed(
          rules,
          "lightTemp",
          String(request.frontLightTempK),
          issues,
          "temperatură lumină",
        )
      ) {
        config.lighting.front.temperatureK =
          request.frontLightTempK as typeof config.lighting.front.temperatureK;
        applied.push("lightTemp:front");
      }
    }
  }
  if (request.backLightTempK !== undefined) {
    if (!rejectFixedOrHidden(rules, "lightTemp", issues, "temperatură lumină")) {
      if (
        assertAllowed(
          rules,
          "lightTemp",
          String(request.backLightTempK),
          issues,
          "temperatură lumină",
        )
      ) {
        config.lighting.back.temperatureK =
          request.backLightTempK as typeof config.lighting.back.temperatureK;
        applied.push("lightTemp:back");
      }
    }
  }

  // Switch
  if (request.switchType !== undefined) {
    if (!rejectFixedOrHidden(rules, "switchType", issues, "întrerupător")) {
      if (
        assertAllowed(
          rules,
          "switchType",
          request.switchType,
          issues,
          "întrerupător",
        )
      ) {
        const qty = request.switchQty ?? 1;
        config.lighting.switches = [
          {
            type: request.switchType as "mechanical" | "touch" | "motion",
            qty,
            associatedSystem: "shared",
          },
        ];
        applied.push("switchType");
      }
    }
  }

  // Defog
  if (request.defogEnabled !== undefined) {
    if (request.defogEnabled !== config.processing.defogEnabled) {
      if (!rejectFixedOrHidden(rules, "defog", issues, "dezaburire")) {
        if (
          request.defogEnabled &&
          !assertAllowed(rules, "defog", "enabled", issues, "dezaburire")
        ) {
          // reject enable
        } else {
          config.processing.defogEnabled = request.defogEnabled;
          applied.push("defog");
        }
      }
    }
  }
  if (request.defogSize !== undefined) {
    if (!rejectFixedOrHidden(rules, "defog", issues, "dezaburire")) {
      if (
        assertAllowed(
          rules,
          "defog",
          `size:${request.defogSize}`,
          issues,
          "dezaburire",
        )
      ) {
        config.processing.defogSize =
          request.defogSize as typeof config.processing.defogSize;
        applied.push("defogSize");
      }
    }
  }
  if (request.defogControl !== undefined) {
    if (!rejectFixedOrHidden(rules, "defog", issues, "dezaburire")) {
      if (
        assertAllowed(
          rules,
          "defog",
          `control:${request.defogControl}`,
          issues,
          "dezaburire",
        )
      ) {
        config.processing.defogControl =
          request.defogControl as typeof config.processing.defogControl;
        applied.push("defogControl");
      }
    }
  }

  // Frames
  if (request.frameType !== undefined) {
    if (!rejectFixedOrHidden(rules, "frames", issues, "rame")) {
      if (assertAllowed(rules, "frames", request.frameType, issues, "rame")) {
        config.processing.frameType =
          request.frameType as typeof config.processing.frameType;
        applied.push("frames");
      }
    }
  }

  // Facets
  if (request.facetEnabled !== undefined) {
    if (request.facetEnabled !== config.processing.facetEnabled) {
      if (!rejectFixedOrHidden(rules, "facets", issues, "fațete")) {
        if (
          request.facetEnabled &&
          !assertAllowed(rules, "facets", "enabled", issues, "fațete")
        ) {
          // reject
        } else {
          config.processing.facetEnabled = request.facetEnabled;
          applied.push("facets");
        }
      }
    }
  }
  if (request.facetShape !== undefined) {
    if (!rejectFixedOrHidden(rules, "facets", issues, "fațete")) {
      if (
        assertAllowed(
          rules,
          "facets",
          `shape:${request.facetShape}`,
          issues,
          "fațete",
        )
      ) {
        config.processing.facetShape =
          request.facetShape as typeof config.processing.facetShape;
        applied.push("facetShape");
      }
    }
  }
  if (request.facetWidthMm !== undefined) {
    if (!rejectFixedOrHidden(rules, "facets", issues, "fațete")) {
      if (
        assertAllowed(
          rules,
          "facets",
          `width:${request.facetWidthMm}`,
          issues,
          "fațete",
        )
      ) {
        config.processing.facetWidthMm =
          request.facetWidthMm as typeof config.processing.facetWidthMm;
        applied.push("facetWidthMm");
      }
    }
  }

  // Sandblast
  if (request.sandblastFinish !== undefined) {
    if (
      !rejectFixedOrHidden(rules, "decorativeSandblast", issues, "sablare")
    ) {
      if (
        assertAllowed(
          rules,
          "decorativeSandblast",
          request.sandblastFinish,
          issues,
          "sablare",
        )
      ) {
        config.processing.sandblastFinish =
          request.sandblastFinish as typeof config.processing.sandblastFinish;
        applied.push("decorativeSandblast");
      }
    }
  }

  // Engraving
  if (request.engravingEnabled !== undefined) {
    if (request.engravingEnabled !== config.processing.engravingEnabled) {
      if (!rejectFixedOrHidden(rules, "engraving", issues, "gravură")) {
        if (
          request.engravingEnabled &&
          !assertAllowed(rules, "engraving", "enabled", issues, "gravură")
        ) {
          // reject
        } else {
          config.processing.engravingEnabled = request.engravingEnabled;
          applied.push("engraving");
        }
      }
    }
  }

  // Cutouts
  if (request.cutouts !== undefined) {
    if (!rejectFixedOrHidden(rules, "cutouts", issues, "decupaje")) {
      const next = [];
      let ok = true;
      for (const cut of request.cutouts) {
        if (!assertAllowed(rules, "cutouts", cut.type, issues, "decupaje")) {
          ok = false;
          break;
        }
        next.push({
          type: cut.type as never,
          qty: cut.qty,
          diameterMm: null,
          widthMm: null,
          heightMm: null,
        });
      }
      if (ok) {
        config.processing.cutouts = next;
        applied.push("cutouts");
      }
    }
  }

  // Accessories
  if (request.accessoryIds !== undefined) {
    if (!rejectFixedOrHidden(rules, "accessories", issues, "accesorii")) {
      let ok = true;
      for (const id of request.accessoryIds) {
        if (!assertAllowed(rules, "accessories", id, issues, "accesorii")) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const enabled = new Set(request.accessoryIds);
        config.processing.accessories = config.processing.accessories.map(
          (item) => ({
            ...item,
            enabled: enabled.has(item.id),
          }),
        );
        applied.push("accessories");
      }
    }
  }

  // Logo
  if (request.logoIds !== undefined) {
    if (!rejectFixedOrHidden(rules, "logo", issues, "logo")) {
      let ok = true;
      for (const id of request.logoIds) {
        if (!assertAllowed(rules, "logo", id, issues, "logo")) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const enabled = new Set(request.logoIds);
        config.processing.branding = config.processing.branding.map((item) => ({
          ...item,
          enabled: item.id.startsWith("logo")
            ? enabled.has(item.id)
            : item.enabled,
        }));
        applied.push("logo");
      }
    }
  }

  // Anti-shatter film
  if (request.antiShatterFilmEnabled !== undefined) {
    const current = config.processing.branding.find(
      (item) => item.id === "anti-shatter-film",
    );
    const curEnabled = current?.enabled ?? false;
    if (request.antiShatterFilmEnabled !== curEnabled) {
      if (
        !rejectFixedOrHidden(
          rules,
          "antiShatterFilm",
          issues,
          "folie anti-ciobire",
        )
      ) {
        if (
          request.antiShatterFilmEnabled &&
          !assertAllowed(
            rules,
            "antiShatterFilm",
            "enabled",
            issues,
            "folie anti-ciobire",
          )
        ) {
          // reject
        } else {
          config.processing.branding = config.processing.branding.map(
            (item) =>
              item.id === "anti-shatter-film"
                ? { ...item, enabled: request.antiShatterFilmEnabled! }
                : item,
          );
          applied.push("antiShatterFilm");
        }
      }
    }
  }

  // HIDDEN optional disabled: never auto-enable (already starting from defaults).
  // Structural compatibility after applying allowed changes.
  checkCompatibility(rules.compatibility, config, request, issues);

  // If any hard rejection for attempted FIXED/HIDDEN/disallowed/incompatible on
  // changes that were not applied, result is ok:false when issues present for
  // rejected attempts. Soft: still return sanitized config for pricing of valid subset.
  const hard = issues.some((issue) =>
    [
      "fixed_change",
      "hidden_change",
      "disallowed_option",
      "out_of_limits",
      "invalid_step",
      "invalid_dimension",
      "incompatible",
    ].includes(issue.code),
  );

  // Suppress unused helper warning path — modeAllowsChange used by callers/tests.
  void modeAllowsChange;

  if (hard) {
    return { ok: false, config, rejected: issues, applied };
  }
  return { ok: true, config, rejected: issues, applied };
}

/** Admin-side consistency: defaults within min/max; no contradictory limits. */
export function validateRulesConsistency(
  rules: ConfiguratorRulesV1,
  defaults: { widthMm: number; heightMm: number },
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const axis of ["width", "height"] as const) {
    const rule = rules.dimensions[axis];
    const min = rule.minMm;
    const max = rule.maxMm;
    if (min != null && max != null && min > max) {
      issues.push({
        code: "contradictory_limits",
        feature: axis,
        message: `Minim (${min}) > maxim (${max}) pentru ${axis}.`,
      });
    }
    const value = axis === "width" ? defaults.widthMm : defaults.heightMm;
    if (min != null && value < min) {
      issues.push({
        code: "default_out_of_range",
        feature: axis,
        message: `Implicitul ${value} mm este sub minimul ${min} mm.`,
      });
    }
    if (max != null && value > max) {
      issues.push({
        code: "default_out_of_range",
        feature: axis,
        message: `Implicitul ${value} mm depășește maximul ${max} mm.`,
      });
    }
    if (
      rule.stepMm != null &&
      rule.stepMm > 0 &&
      min != null &&
      !nearlyMultiple(value, min, rule.stepMm)
    ) {
      issues.push({
        code: "default_invalid_step",
        feature: axis,
        message: `Implicitul ${value} mm nu respectă pasul ${rule.stepMm} mm.`,
      });
    }
  }
  return issues;
}
