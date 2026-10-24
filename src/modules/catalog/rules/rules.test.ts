import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  canManageConfiguratorRules,
  canViewConfiguratorRules,
} from "@/modules/catalog/permissions";
import {
  defaultConfiguratorRules,
  resolveConfiguratorRules,
  validateCustomerConfig,
  validateRulesConsistency,
} from "@/modules/catalog/rules";
import type { ConfiguratorRulesV1 } from "@/modules/catalog/rules/types";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { nextOfferNumber } from "@/modules/offers/codes";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import { buildImmutableSnapshot } from "@/modules/offers/snapshots";

const createdModelIds: string[] = [];
const createdOfferIds: string[] = [];

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

function editableDimsRules(): ConfiguratorRulesV1 {
  const rules = defaultConfiguratorRules();
  rules.dimensions.width = {
    mode: "EDITABLE",
    minMm: 400,
    maxMm: 1200,
    stepMm: 50,
  };
  rules.dimensions.height = {
    mode: "EDITABLE",
    minMm: 400,
    maxMm: 1200,
    stepMm: 50,
  };
  rules.features.width = { mode: "EDITABLE", allowedValues: [] };
  rules.features.height = { mode: "EDITABLE", allowedValues: [] };
  return rules;
}

async function requireUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No seeded user");
  }
  return user.id;
}

async function requireCategoryId(): Promise<string> {
  const category = await prisma.mirrorModelCategory.findFirst({
    where: { isActive: true },
  });
  if (!category) {
    throw new Error("No commercial category");
  }
  return category.id;
}

describe("Stage 6.2 configurator rules", () => {
  it("model without rules treats all features as FIXED", () => {
    const rules = resolveConfiguratorRules(null);
    assert.equal(rules.features.shape.mode, "FIXED");
    assert.equal(rules.features.frontLed.mode, "FIXED");
    assert.equal(rules.dimensions.width.mode, "FIXED");

    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules: null,
      request: { widthMm: 700, shapeId: "ellipse" },
    });
    assert.equal(result.ok, false);
    assert.ok(result.rejected.some((issue) => issue.code === "fixed_change"));
    assert.equal(result.config.widthMm, 600);
    assert.equal(result.config.shapeId, "rectangular");
  });

  it("rejects FIXED field modification attempts", () => {
    const rules = defaultConfiguratorRules();
    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { glassTypeId: "bronz" },
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.rejected.some(
        (issue) => issue.code === "fixed_change" && issue.feature === "glassType",
      ),
    );
  });

  it("rejects HIDDEN field modification attempts (hidden ≠ disable)", () => {
    const rules = defaultConfiguratorRules();
    rules.features.defog = { mode: "HIDDEN", allowedValues: [] };
    const result = validateCustomerConfig({
      modelDefault: baseState({
        processing: {
          ...defaultProcessingConfig(),
          defogEnabled: false,
        },
      }),
      rules,
      request: { defogEnabled: true },
    });
    assert.equal(result.ok, false);
    assert.ok(result.rejected.some((issue) => issue.code === "hidden_change"));
    assert.equal(result.config.processing.defogEnabled, false);
  });

  it("allows EDITABLE changes within allowed values", () => {
    const rules = defaultConfiguratorRules();
    rules.features.glassType = {
      mode: "EDITABLE",
      allowedValues: ["standard", "diamant"],
    };
    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { glassTypeId: "diamant" },
    });
    assert.equal(result.ok, true);
    assert.equal(result.config.glassTypeId, "diamant");
    assert.ok(result.applied.includes("glassType"));
  });

  it("rejects out-of-limits dimensions", () => {
    const rules = editableDimsRules();
    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { widthMm: 2000 },
    });
    assert.equal(result.ok, false);
    assert.ok(result.rejected.some((issue) => issue.code === "out_of_limits"));
  });

  it("rejects invalid dimension step", () => {
    const rules = editableDimsRules();
    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { widthMm: 425 },
    });
    assert.equal(result.ok, false);
    assert.ok(result.rejected.some((issue) => issue.code === "invalid_step"));
  });

  it("rejects disallowed option for EDITABLE feature", () => {
    const rules = defaultConfiguratorRules();
    rules.features.ledPosition = {
      mode: "EDITABLE",
      allowedValues: ["two_height", "perimeter"],
    };
    const lighting = defaultLightingConfig();
    lighting.lightingType = "back";
    const result = validateCustomerConfig({
      modelDefault: baseState({ lighting }),
      rules,
      request: { backLedPositioning: "one_width" },
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.rejected.some((issue) => issue.code === "disallowed_option"),
    );
  });

  it("rejects incompatible combo (temp without LED)", () => {
    const rules = defaultConfiguratorRules();
    rules.features.lightTemp = {
      mode: "EDITABLE",
      allowedValues: ["3000", "4000", "6000"],
    };
    const result = validateCustomerConfig({
      modelDefault: baseState(), // lighting none
      rules,
      request: { frontLightTempK: 3000 },
    });
    assert.equal(result.ok, false);
    assert.ok(
      result.rejected.some(
        (issue) =>
          issue.code === "incompatible" || issue.code === "fixed_change",
      ),
    );
  });

  it("rejects enabling front LED when FIXED forbidden / not allowed", () => {
    const rules = defaultConfiguratorRules();
    rules.features.frontLed = { mode: "FIXED", allowedValues: [] };
    const result = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { frontLedEnabled: true },
    });
    assert.equal(result.ok, false);
    assert.ok(result.rejected.some((issue) => issue.code === "fixed_change"));
    assert.equal(result.config.lighting.lightingType, "none");
  });

  it("dimension change recalculates glass, LED length and 10% via central engine", async () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "back";
    lighting.back.positioning = "two_height";
    lighting.back.stripTypeId = "standard-15w";
    lighting.back.temperatureK = 4000;

    const rules = editableDimsRules();
    rules.features.backLed = { mode: "EDITABLE", allowedValues: ["enabled"] };
    rules.features.ledPosition = {
      mode: "EDITABLE",
      allowedValues: ["two_height"],
    };

    const validated = validateCustomerConfig({
      modelDefault: baseState({ lighting, widthMm: 600, heightMm: 800 }),
      rules,
      request: { widthMm: 800, heightMm: 1000 },
    });
    assert.equal(validated.ok, true);
    assert.equal(validated.config.widthMm, 800);
    assert.equal(validated.config.heightMm, 1000);

    const { calculation } = await recalculateFromConfigPayload(
      validated.config as unknown as Record<string, unknown>,
    );
    assert.equal(calculation?.status, "COMPLETE");
    // glass 0.8 m² * 600 = 480
    assert.equal(calculation?.glassCost, 480);
    // two vertical @ 1000mm → 2 * 1.0 * 1.1 = 2.2 m * 40 = 88
    assert.equal(calculation?.electrical?.backLed, 88);
    assert.ok((calculation?.totalProductionCost ?? 0) >= 480 + 88);
  });

  it("prices only via central engine — no client-imposed price fields", async () => {
    const rules = editableDimsRules();
    const validated = validateCustomerConfig({
      modelDefault: baseState(),
      rules,
      request: { widthMm: 600, heightMm: 800 },
    });
    assert.equal(validated.ok, true);
    const { calculation } = await recalculateFromConfigPayload(
      validated.config as unknown as Record<string, unknown>,
    );
    assert.equal(calculation?.glassCost, 288);
    assert.ok(calculation?.wholesalePrice != null);
    assert.ok(calculation?.retailPrice != null);
    assert.equal(
      Object.prototype.hasOwnProperty.call(validated.config, "retailPrice"),
      false,
    );
  });

  it("ADMIN can manage rules; MANAGER can only view", () => {
    assert.equal(canManageConfiguratorRules("ADMIN"), true);
    assert.equal(canManageConfiguratorRules("MANAGER"), false);
    assert.equal(canViewConfiguratorRules("MANAGER"), true);
  });

  it("validateRulesConsistency catches contradictory limits", () => {
    const rules = editableDimsRules();
    rules.dimensions.width.minMm = 900;
    rules.dimensions.width.maxMm = 500;
    const issues = validateRulesConsistency(rules, {
      widthMm: 600,
      heightMm: 800,
    });
    assert.ok(issues.some((issue) => issue.code === "contradictory_limits"));
  });

  it("rule changes do not alter issued offer revision snapshots", async () => {
    const userId = await requireUserId();
    const categoryId = await requireCategoryId();
    const state = baseState();
    const { calculation } = await recalculateFromConfigPayload(
      state as unknown as Record<string, unknown>,
    );
    assert.equal(calculation?.status, "COMPLETE");

    const model = await prisma.mirrorModel.create({
      data: {
        code: `MOD-RULE-${Date.now()}`,
        name: "Rules integrity",
        slug: `rules-integrity-${Date.now()}`,
        categoryId,
        status: "ACTIVE",
        configJson: state as object,
        calculationJson: calculation as object,
        calcStatus: "COMPLETE",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
        configuratorRulesJson: defaultConfiguratorRules() as object,
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(model.id);

    const number = await nextOfferNumber();
    const unitPrice = calculation!.retailPrice!;
    const offer = await prisma.customerOffer.create({
      data: {
        number,
        status: "ISSUED",
        mirrorModelId: model.id,
        clientName: "Client Rules",
        clientPhone: "+37360000999",
        productName: model.name,
        quantity: 1,
        priceTier: "retail",
        validityDays: 14,
        draftConfigJson: state as object,
        draftCalculationJson: calculation as object,
        issuedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdOfferIds.push(offer.id);

    const snapshot = buildImmutableSnapshot({
      offerNumber: number,
      revisionNumber: 1,
      state,
      calculation: calculation!,
      client: { name: "Client Rules", phone: "+37360000999" },
      productName: model.name,
      quantity: 1,
      priceTier: "retail",
      unitPrice,
      servicesTotal: 0,
      offerTotal: unitPrice,
      validityDays: 14,
      validUntil: null,
      company: {
        legalName: "ZERA",
        taxId: "1",
        address: "Chisinau",
        phone: "+373",
        email: null,
        bankDetails: null,
      },
    });

    await prisma.offerRevision.create({
      data: {
        offerId: offer.id,
        revisionNumber: 1,
        snapshotJson: snapshot as object,
        unitPrice: new Prisma.Decimal(unitPrice),
        servicesTotal: new Prisma.Decimal(0),
        offerTotal: new Prisma.Decimal(unitPrice),
        priceTier: "retail",
        configJson: state as object,
        calculationPublicJson: snapshot.publicCalculation as object,
        issuedById: userId,
      },
    });

    const frozen = unitPrice;
    const nextRules = editableDimsRules();
    nextRules.features.glassType = {
      mode: "EDITABLE",
      allowedValues: ["standard", "bronz"],
    };

    await prisma.mirrorModel.update({
      where: { id: model.id },
      data: {
        configuratorRulesJson: nextRules as object,
        rulesVersion: { increment: 1 },
        minWidthMm: new Prisma.Decimal(400),
        maxWidthMm: new Prisma.Decimal(1200),
      },
    });

    const revision = await prisma.offerRevision.findFirst({
      where: { offerId: offer.id, revisionNumber: 1 },
    });
    assert.equal(Number(revision!.unitPrice), frozen);

    const updatedModel = await prisma.mirrorModel.findUnique({
      where: { id: model.id },
    });
    assert.equal(updatedModel!.rulesVersion, 2);
  });

  it("preserves Stage 5.x–6.1 tech identifiers through rules apply", () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "perimeter";
    lighting.front.stripTypeId = "standard-15w";
    lighting.front.temperatureK = 4000;

    const rules = defaultConfiguratorRules();
    rules.features.ledPosition = {
      mode: "EDITABLE",
      allowedValues: ["perimeter", "two_height"],
    };
    rules.features.lightTemp = {
      mode: "EDITABLE",
      allowedValues: ["3000", "4000"],
    };

    const result = validateCustomerConfig({
      modelDefault: baseState({ lighting }),
      rules,
      request: {
        frontLedPositioning: "two_height",
        frontLightTempK: 3000,
      },
    });
    assert.equal(result.ok, true);
    assert.equal(result.config.lighting.front.positioning, "two_height");
    assert.equal(result.config.lighting.front.temperatureK, 3000);
    assert.equal(result.config.lighting.front.stripTypeId, "standard-15w");
  });
});

after(async () => {
  if (createdOfferIds.length > 0) {
    await prisma.offerRevision.deleteMany({
      where: { offerId: { in: createdOfferIds } },
    });
    await prisma.customerOffer.deleteMany({
      where: { id: { in: createdOfferIds } },
    });
  }
  if (createdModelIds.length > 0) {
    await prisma.mirrorModel.deleteMany({
      where: { id: { in: createdModelIds } },
    });
  }
  await prisma.$disconnect();
});
