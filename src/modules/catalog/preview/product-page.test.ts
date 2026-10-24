import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { composeProductCopy } from "@/modules/catalog/preview/product-copy";
import {
  nextGalleryIndex,
  productStatusNote,
} from "@/modules/catalog/preview/product-presentation";
import { ORDER_FORM_NOTE } from "@/modules/orders/public";
import { assembleMirrorPreview } from "@/modules/catalog/preview/view";
import { canViewCatalog } from "@/modules/catalog/permissions";
import { defaultConfiguratorRules, validateCustomerConfig } from "@/modules/catalog/rules";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";

function baseState(lighting = defaultLightingConfig()): ConfiguratorState {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting,
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

function copyFrom(state: ConfiguratorState, rulesJson: unknown = null) {
  return composeProductCopy({
    descriptionJson: {
      version: 1,
      locale: "ro",
      blocks: [
        {
          type: "paragraph",
          children: [
            { type: "text", text: "<script>alert(1)</script>Oglindă " },
            { type: "text", text: "clară", bold: true },
            { type: "link", text: "atac", href: "javascript:alert(1)" },
          ],
        },
      ],
    },
    fullDescription: null,
    highlightsJson: null,
    careJson: null,
    warrantyJson: null,
    deliveryJson: null,
    extraSpecsJson: [
      { id: "shape-copy", label: "Forma oglinzii", value: "altceva" },
      { id: "note", label: "Grosime sticlă", value: "menționată de administrator" },
      { id: "xss", label: "<b>Notă</b>", value: "<img src=x onerror=alert(1)>" },
    ],
    seoTitle: "<b>Titlu</b>",
    seoDescription: "Descriere meta",
    slug: "oglinda-test",
    rulesJson,
    state,
  });
}

describe("product page preview", () => {
  it("follows the selected configuration and hides forbidden options", () => {
    const off = copyFrom(baseState());
    assert.equal(
      off.specs.some((spec) => spec.label === "Temperatura luminii"),
      false,
    );
    assert.equal(off.specs.some((spec) => spec.label === "Grosimea sticlei"), false);

    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.switches = [{ type: "touch", qty: 1, associatedSystem: "front" }];
    const on = copyFrom(baseState(lighting));
    assert.equal(
      on.specs.find((spec) => spec.label === "Temperatura luminii")?.value.includes("4000K"),
      true,
    );
    assert.equal(
      on.specs.find((spec) => spec.label === "Tip întrerupător")?.value.includes("Touch"),
      true,
    );

    const rules = defaultConfiguratorRules();
    rules.features.shape = { mode: "HIDDEN" };
    rules.features.frontLed = { mode: "HIDDEN" };
    rules.features.backLed = { mode: "HIDDEN" };
    const hidden = copyFrom(baseState(lighting), rules);
    assert.equal(hidden.specs.some((spec) => spec.label === "Forma oglinzii"), false);
    assert.equal(hidden.specs.some((spec) => spec.label === "Tip iluminare LED"), false);
    assert.equal(hidden.specs.some((spec) => spec.label === "Temperatura luminii"), false);
  });

  it("keeps descriptive specs, strips HTML, and omits internal prices", () => {
    const copy = copyFrom(baseState());
    assert.equal(copy.extraSpecs.some((spec) => spec.label === "Forma oglinzii"), false);
    assert.equal(copy.extraSpecs.find((spec) => spec.id === "note")?.value, "menționată de administrator");
    assert.equal(copy.extraSpecs.some((spec) => spec.label.includes("<")), false);
    assert.equal(copy.extraSpecs.some((spec) => spec.value.includes("<")), false);
    assert.equal(JSON.stringify(copy).includes("<script"), false);
    assert.equal(JSON.stringify(copy).includes("javascript:"), false);
    assert.equal(copy.seo.title, "Titlu");
    assert.match(ORDER_FORM_NOTE, /nu este nevoie de cont sau parolă/i);
    assert.equal(/nu se creează nicio comandă/i.test(ORDER_FORM_NOTE), false);

    const state = baseState();
    const validated = validateCustomerConfig({
      modelDefault: state,
      rules: defaultConfiguratorRules(),
      request: {},
    });
    const view = assembleMirrorPreview({
      model: {
        id: "model-preview",
        name: "Oglindă test",
        code: "MOD-TEST",
        shortDescription: "Scurt",
        fullDescription: null,
        status: "ARCHIVED",
      },
      rules: defaultConfiguratorRules(),
      modelDefault: state,
      validated,
      priceSource: {
        status: "INCOMPLETE",
        retailPrice: 150,
        missingCosts: ["cost intern"],
      },
      blockers: [],
      includeDiagnostic: false,
      gallery: [],
      productCopy: copy,
    });
    assert.equal(view.customer.price.available, false);
    assert.equal(view.customer.price.retailPrice, null);
    assert.equal(findForbiddenCommercialKey(view.customer), null);
    assert.equal(JSON.stringify(view.customer).includes("cost intern"), false);
    assert.equal(view.diagnostic, null);
    assert.equal(productStatusNote("ARCHIVED")?.includes("arhivat"), true);
    assert.equal(productStatusNote("ACTIVE"), null);
    assert.equal(productStatusNote("DRAFT")?.includes("ciornă"), true);
    assert.equal(canViewCatalog("ADMIN"), true);
    assert.equal(canViewCatalog("MANAGER"), true);
  });

  it("wraps gallery navigation", () => {
    assert.equal(nextGalleryIndex(0, 3, -1), 2);
    assert.equal(nextGalleryIndex(2, 3, 1), 0);
    assert.equal(nextGalleryIndex(0, 0, 1), 0);
  });
});
