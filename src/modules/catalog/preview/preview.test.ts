import "dotenv/config";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { applyCustomerPatch, isLatestPreviewResponse } from "@/modules/catalog/preview/patch";
import { assembleMirrorPreview } from "@/modules/catalog/preview/view";
import { defaultConfiguratorRules, validateCustomerConfig } from "@/modules/catalog/rules";
import { customerConfigRequestSchema } from "@/modules/catalog/rules/schemas";
import type { ConfiguratorRulesV1 } from "@/modules/catalog/rules/types";
import { canManageConfiguratorRules } from "@/modules/catalog/permissions";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";

function baseState(overrides: Partial<ConfiguratorState> = {}): ConfiguratorState {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
    ...overrides,
  };
}

function previewModel() {
  return {
    id: "model-preview",
    name: "Oglindă test",
    code: "MOD-TEST",
    shortDescription: "Scurt",
    fullDescription: null,
    status: "DRAFT" as const,
  };
}

function assembleFrom(
  rules: ConfiguratorRulesV1,
  state: ConfiguratorState,
  request: Parameters<typeof validateCustomerConfig>[0]["request"],
  options?: {
    includeDiagnostic?: boolean;
    priceSource?: {
      status: "COMPLETE" | "INCOMPLETE";
      retailPrice: number | null;
      missingCosts?: string[];
    } | null;
  },
) {
  const validated = validateCustomerConfig({
    modelDefault: state,
    rules,
    request,
  });
  return assembleMirrorPreview({
    model: previewModel(),
    rules,
    modelDefault: state,
    validated,
    priceSource: options?.priceSource ?? {
      status: "COMPLETE",
      retailPrice: 100,
      missingCosts: [],
    },
    blockers: [],
    includeDiagnostic: options?.includeDiagnostic ?? false,
  });
}

describe("customer configurator preview", () => {
  it("loads the default configuration and shows FIXED values", () => {
    const view = assembleFrom(defaultConfiguratorRules(), baseState(), {});
    const shape = view.customer.controls.find((control) => control.id === "shape");
    const width = view.customer.controls.find((control) => control.id === "width");
    assert.equal(shape?.kind, "text");
    assert.equal(shape && shape.kind === "text" ? shape.valueLabel : "", "Dreptunghiulară");
    assert.equal(width?.kind, "dimension");
    assert.equal(width && width.kind === "dimension" ? width.mode : "", "FIXED");
    assert.equal(width && width.kind === "dimension" ? width.value : 0, 600);
    assert.equal(view.customer.selection.widthMm, undefined);
  });

  it("shows EDITABLE controls and hides HIDDEN ones", () => {
    const rules = defaultConfiguratorRules();
    rules.features.glassType = {
      mode: "EDITABLE",
      allowedValues: ["standard", "bronz"],
    };
    rules.features.defog = { mode: "HIDDEN", allowedValues: [] };
    rules.features.frontLed = { mode: "HIDDEN", allowedValues: [] };
    const view = assembleFrom(rules, baseState(), {});
    const glass = view.customer.controls.find((control) => control.id === "glassType");
    assert.equal(glass?.kind, "select");
    assert.equal(
      glass && glass.kind === "select"
        ? glass.options.map((option) => option.id).join(",")
        : "",
      "standard,bronz",
    );
    assert.equal(
      view.customer.controls.some((control) => control.id === "defog"),
      false,
    );
    assert.equal(
      view.customer.controls.some((control) => control.id === "frontLed"),
      false,
    );
  });

  it("rejects dimensions under the minimum, over the maximum, and off-step", () => {
    const rules = defaultConfiguratorRules();
    rules.dimensions.width = {
      mode: "EDITABLE",
      minMm: 500,
      maxMm: 900,
      stepMm: 50,
    };
    const tooSmall = assembleFrom(rules, baseState(), { widthMm: 400 });
    const width = tooSmall.customer.controls.find((control) => control.id === "width");
    assert.equal(width?.kind, "dimension");
    assert.equal(width && width.kind === "dimension" ? width.value : 0, 600);
    assert.ok(tooSmall.customer.notices.some((notice) => notice.includes("sub minimul")));

    const tooLarge = assembleFrom(rules, baseState(), { widthMm: 950 });
    assert.ok(tooLarge.customer.notices.some((notice) => notice.includes("depășește maximul")));

    const badStep = assembleFrom(rules, baseState(), { widthMm: 620 });
    assert.ok(badStep.customer.notices.some((notice) => notice.includes("pasul")));
    assert.equal(badStep.customer.selection.widthMm, undefined);
  });

  it("rejects a disallowed option and a FIXED change", () => {
    const rules = defaultConfiguratorRules();
    rules.features.glassType = { mode: "EDITABLE", allowedValues: ["standard"] };
    const disallowed = assembleFrom(rules, baseState(), { glassTypeId: "bronz" });
    assert.ok(disallowed.customer.notices.some((notice) => notice.includes("nu este permisă")));
    assert.equal(disallowed.customer.selection.glassTypeId, undefined);

    const fixed = assembleFrom(defaultConfiguratorRules(), baseState(), {
      glassTypeId: "bronz",
    });
    assert.ok(fixed.customer.notices.some((notice) => notice.includes("fix")));
  });

  it("hides LED details when lighting is off", () => {
    const rules = defaultConfiguratorRules();
    rules.features.lightTemp = {
      mode: "EDITABLE",
      allowedValues: ["3000", "4000", "6000"],
    };
    const view = assembleFrom(rules, baseState(), { frontLightTempK: 3000 });
    assert.equal(
      view.customer.controls.some((control) => control.id === "front-temp"),
      false,
    );
    assert.ok(view.customer.notices.some((notice) => notice.includes("iluminare")));
  });

  it("does not publish sinecost or wholesale and withholds an incomplete price", () => {
    const hiddenCause = "Bandă LED față: fără preț asociat în catalog";
    const view = assembleFrom(defaultConfiguratorRules(), baseState(), {}, {
      includeDiagnostic: true,
      priceSource: {
        status: "INCOMPLETE",
        retailPrice: 120,
        missingCosts: [hiddenCause],
      },
    });
    assert.equal(view.customer.price.available, false);
    assert.equal(view.customer.price.retailPrice, null);
    assert.equal(view.customer.price.message, "Preț indisponibil momentan");
    assert.equal(findForbiddenCommercialKey(view.customer), null);
    assert.equal(JSON.stringify(view.customer).includes(hiddenCause), false);
    assert.equal(view.diagnostic?.missingCauses.includes(hiddenCause), true);
    assert.equal(JSON.stringify(view.customer).includes("wholesale"), false);
    assert.equal(JSON.stringify(view.customer).includes("sinecost"), false);
  });

  it("drops internal prices from the customer request schema", () => {
    const parsed = customerConfigRequestSchema.safeParse({
      widthMm: 600,
      retailPrice: 10,
      sinecost: 5,
      wholesalePrice: 8,
    });
    assert.equal(parsed.success, false);
  });

  it("keeps only the latest async response", () => {
    assert.equal(isLatestPreviewResponse(1, 3), false);
    assert.equal(isLatestPreviewResponse(2, 3), false);
    assert.equal(isLatestPreviewResponse(3, 3), true);
  });

  it("removes dependent LED fields when lighting is turned off", () => {
    const next = applyCustomerPatch(
      {
        frontLedEnabled: true,
        frontLedPositioning: "two_height",
        frontLightTempK: 3000,
        switchType: "touch",
      },
      { field: "frontLedEnabled", value: false },
    );
    assert.equal(next.frontLedEnabled, false);
    assert.equal(next.frontLedPositioning, undefined);
    assert.equal(next.frontLightTempK, undefined);
  });

  it("gives diagnostic tools to ADMIN only", () => {
    const admin = assembleFrom(defaultConfiguratorRules(), baseState(), {}, {
      includeDiagnostic: canManageConfiguratorRules("ADMIN"),
    });
    const manager = assembleFrom(defaultConfiguratorRules(), baseState(), {}, {
      includeDiagnostic: canManageConfiguratorRules("MANAGER"),
    });
    assert.ok(admin.diagnostic);
    assert.equal(admin.diagnostic?.features.some((feature) => feature.mode === "FIXED"), true);
    assert.equal(manager.diagnostic, null);
  });

  it("recalculates retail through the central engine, including the LED 10% supplement", async () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "back";
    lighting.back.positioning = "two_height";
    lighting.back.stripTypeId = "standard-15w";
    lighting.back.temperatureK = 4000;
    const rules = defaultConfiguratorRules();
    rules.dimensions.width = { mode: "EDITABLE", minMm: 400, maxMm: 1200, stepMm: 50 };
    rules.dimensions.height = { mode: "EDITABLE", minMm: 400, maxMm: 1600, stepMm: 50 };
    rules.features.backLed = { mode: "EDITABLE", allowedValues: ["enabled"] };
    rules.features.ledPosition = { mode: "EDITABLE", allowedValues: ["two_height"] };

    const state = baseState({ lighting, widthMm: 600, heightMm: 800 });
    const validated = validateCustomerConfig({
      modelDefault: state,
      rules,
      request: { widthMm: 800, heightMm: 1000 },
    });
    assert.equal(validated.ok, true);
    const { calculation } = await recalculateFromConfigPayload(
      validated.config as unknown as Record<string, unknown>,
    );
    assert.equal(calculation?.status, "COMPLETE");
    assert.equal(calculation?.electrical?.backLed, 88);

    const view = assembleMirrorPreview({
      model: previewModel(),
      rules,
      modelDefault: state,
      validated,
      priceSource: {
        status: calculation!.status,
        retailPrice: calculation!.retailPrice,
        missingCosts: calculation!.missingCosts,
      },
      blockers: [],
      includeDiagnostic: false,
    });

    assert.equal(view.customer.price.retailPrice, calculation?.retailPrice);
    assert.notEqual(view.customer.price.retailPrice, calculation?.wholesalePrice);
    assert.equal(findForbiddenCommercialKey(view.customer), null);
    assert.equal(view.customer.selection.widthMm, 800);
    assert.equal(view.customer.selection.heightMm, 1000);
  });
});
