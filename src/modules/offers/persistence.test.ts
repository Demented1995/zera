import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { prisma } from "@/lib/db/prisma";
import { nextConfigurationCode, nextOfferNumber } from "@/modules/offers/codes";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import { buildImmutableSnapshot } from "@/modules/offers/snapshots";
import { deriveConfigStatus } from "@/modules/offers/status";

const createdConfigIds: string[] = [];
const createdOfferIds: string[] = [];

async function requireUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No seeded user — run db:seed before persistence tests.");
  }
  return user.id;
}

function rectangularConfig() {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 1000,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

describe("Stage 5.5 persistence + immutability", () => {
  it("saves complete configuration with structured JSON and prices", async () => {
    const userId = await requireUserId();
    const config = rectangularConfig();
    const { calculation } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "COMPLETE");
    assert.equal(calculation?.glassCost, 360);

    const code = await nextConfigurationCode();
    const row = await prisma.savedConfiguration.create({
      data: {
        code,
        name: "Test complete 600x1000",
        status: deriveConfigStatus(calculation, false),
        configJson: config,
        calculationJson: calculation as object,
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        widthMm: new Prisma.Decimal(600),
        heightMm: new Prisma.Decimal(1000),
        glassTypeId: "standard",
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdConfigIds.push(row.id);
    assert.equal(row.status, "COMPLETE");
    assert.match(row.code, /^CFG-\d{4}-\d{4}$/);
    const loaded = await prisma.savedConfiguration.findUnique({
      where: { id: row.id },
    });
    assert.equal((loaded?.configJson as { widthMm: number }).widthMm, 600);
  });

  it("saves incomplete configuration as INCOMPLETE draft-capable", async () => {
    const userId = await requireUserId();
    const config = {
      ...rectangularConfig(),
      glassTypeId: "bronz",
    };
    const { calculation } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "INCOMPLETE");

    const code = await nextConfigurationCode();
    const row = await prisma.savedConfiguration.create({
      data: {
        code,
        name: "Incomplete bronz",
        status: deriveConfigStatus(calculation, true),
        configJson: config,
        calculationJson: calculation as object,
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        widthMm: new Prisma.Decimal(600),
        heightMm: new Prisma.Decimal(1000),
        glassTypeId: "bronz",
        createdById: userId,
        updatedById: userId,
      },
    });
    createdConfigIds.push(row.id);
    assert.equal(row.status, "INCOMPLETE");
  });

  it("duplicates config with new identity and Copie name, without offers", async () => {
    const userId = await requireUserId();
    const source = await prisma.savedConfiguration.findFirst({
      where: { id: { in: createdConfigIds }, status: "COMPLETE" },
    });
    assert.ok(source);
    const code = await nextConfigurationCode();
    const copy = await prisma.savedConfiguration.create({
      data: {
        code,
        name: `Copie — ${source!.name}`,
        status: source!.status,
        configJson: source!.configJson as object,
        calculationJson: source!.calculationJson as object,
        shapeId: source!.shapeId,
        shapeLabel: source!.shapeLabel,
        widthMm: source!.widthMm,
        heightMm: source!.heightMm,
        glassTypeId: source!.glassTypeId,
        sinecost: source!.sinecost,
        wholesalePrice: source!.wholesalePrice,
        retailPrice: source!.retailPrice,
        createdById: userId,
        updatedById: userId,
      },
    });
    createdConfigIds.push(copy.id);
    assert.notEqual(copy.id, source!.id);
    assert.notEqual(copy.code, source!.code);
    assert.ok(copy.name.startsWith("Copie — "));
    const offerCount = await prisma.customerOffer.count({
      where: { configurationId: copy.id },
    });
    assert.equal(offerCount, 0);
  });

  it("edit + recalculate updates prices on working config", async () => {
    const source = await prisma.savedConfiguration.findFirst({
      where: { id: { in: createdConfigIds }, status: "COMPLETE" },
    });
    assert.ok(source);
    const nextConfig = {
      ...(source!.configJson as object),
      widthMm: 800,
      heightMm: 1000,
    };
    const { calculation } = await recalculateFromConfigPayload(
      nextConfig as Record<string, unknown>,
    );
    assert.equal(calculation?.glassCost, 480);
    const updated = await prisma.savedConfiguration.update({
      where: { id: source!.id },
      data: {
        configJson: nextConfig,
        calculationJson: calculation as object,
        widthMm: new Prisma.Decimal(800),
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
      },
    });
    assert.equal(Number(updated.widthMm), 800);
    assert.equal(Number(updated.sinecost), 480);
  });

  it("issues offer with immutable snapshot; later tariff change does not alter revision", async () => {
    const userId = await requireUserId();
    await prisma.companySettings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        legalName: "ZERA Test SRL",
        taxId: "1002600000000",
        address: "Chișinău",
        phone: "+37322000000",
      },
      update: {
        legalName: "ZERA Test SRL",
        taxId: "1002600000000",
        address: "Chișinău",
        phone: "+37322000000",
      },
    });

    const cfg = await prisma.savedConfiguration.findFirst({
      where: { id: { in: createdConfigIds }, status: "COMPLETE" },
    });
    assert.ok(cfg);

    const config = cfg!.configJson as Record<string, unknown>;
    const { state, calculation } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "COMPLETE");

    const number = await nextOfferNumber();
    const offer = await prisma.customerOffer.create({
      data: {
        number,
        status: "DRAFT",
        configurationId: cfg!.id,
        clientName: "Client Snapshot",
        clientPhone: "+37362222222",
        productName: cfg!.name,
        quantity: 1,
        priceTier: "retail",
        validityDays: 14,
        draftConfigJson: config as Prisma.InputJsonValue,
        draftCalculationJson: calculation as unknown as Prisma.InputJsonValue,
        createdById: userId,
        updatedById: userId,
      },
    });
    createdOfferIds.push(offer.id);

    const unitPrice = calculation!.retailPrice!;
    const servicesTotal = calculation!.financial?.services.total ?? 0;
    const offerTotal = unitPrice + servicesTotal;
    const snapshot = buildImmutableSnapshot({
      offerNumber: number,
      revisionNumber: 1,
      state,
      calculation: calculation!,
      client: { name: "Client Snapshot", phone: "+37362222222" },
      productName: cfg!.name,
      quantity: 1,
      priceTier: "retail",
      unitPrice,
      servicesTotal: servicesTotal ?? 0,
      offerTotal,
      validityDays: 14,
      validUntil: new Date(Date.now() + 14 * 86400000),
      company: {
        legalName: "ZERA Test SRL",
        taxId: "1002600000000",
        address: "Chișinău",
        phone: "+37322000000",
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
        servicesTotal: new Prisma.Decimal(servicesTotal ?? 0),
        offerTotal: new Prisma.Decimal(offerTotal),
        priceTier: "retail",
        configJson: state as object,
        calculationPublicJson: snapshot.publicCalculation as object,
        issuedById: userId,
      },
    });
    await prisma.customerOffer.update({
      where: { id: offer.id },
      data: { status: "ISSUED", issuedAt: new Date() },
    });

    const frozenUnit = unitPrice;

    // Simulate admin tariff change AFTER issue (glass price bump in settings path:
    // change material price — working configs would recalculate, revision must not).
    const glass = await prisma.material.findFirst({
      where: { seedKey: "oglinda-standard-dreptunghiulara" },
    });
    assert.ok(glass);
    const previousPrice = glass!.unitPrice;
    await prisma.material.update({
      where: { id: glass!.id },
      data: { unitPrice: new Prisma.Decimal(900) },
    });

    const revision = await prisma.offerRevision.findFirst({
      where: { offerId: offer.id, revisionNumber: 1 },
    });
    assert.equal(Number(revision!.unitPrice), frozenUnit);

    // New revision keeps history; previous revision untouched
    const { calculation: afterChange } =
      await recalculateFromConfigPayload(config);
    assert.ok((afterChange?.glassCost ?? 0) > 360);

    await prisma.offerRevision.create({
      data: {
        offerId: offer.id,
        revisionNumber: 2,
        snapshotJson: {
          ...snapshot,
          revisionNumber: 2,
          unitPrice: afterChange!.retailPrice!,
          offerTotal: afterChange!.retailPrice!,
        },
        unitPrice: new Prisma.Decimal(afterChange!.retailPrice!),
        servicesTotal: new Prisma.Decimal(0),
        offerTotal: new Prisma.Decimal(afterChange!.retailPrice!),
        priceTier: "retail",
        configJson: state as object,
        calculationPublicJson: { unitPrice: afterChange!.retailPrice },
        issuedById: userId,
      },
    });

    const rev1 = await prisma.offerRevision.findFirst({
      where: { offerId: offer.id, revisionNumber: 1 },
    });
    assert.equal(Number(rev1!.unitPrice), frozenUnit);

    // Restore catalog price for other tests
    await prisma.material.update({
      where: { id: glass!.id },
      data: { unitPrice: previousPrice },
    });
  });

  it("blocks issue conceptually when calculation incomplete", async () => {
    const { calculation } = await recalculateFromConfigPayload({
      ...rectangularConfig(),
      glassTypeId: "bronz",
    });
    assert.equal(calculation?.status, "INCOMPLETE");
    assert.equal(calculation?.retailPrice, null);
  });

  it("preserves Stage 5.1–5.4 glass/LED compatibility through recalc", async () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "front";
    lighting.front.positioning = "two_height";
    const { calculation, state } = await recalculateFromConfigPayload({
      ...rectangularConfig(),
      lighting,
    });
    assert.equal(state.widthMm, 600);
    assert.equal(calculation?.glassCost, 360);
    assert.equal(calculation?.electrical?.frontLed, 88);
    assert.equal(calculation?.status, "COMPLETE");
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
  if (createdConfigIds.length > 0) {
    await prisma.savedConfiguration.deleteMany({
      where: { id: { in: createdConfigIds } },
    });
  }
  await prisma.$disconnect();
});
