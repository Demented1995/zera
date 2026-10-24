import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { nextModelCode } from "@/modules/catalog/codes";
import {
  canActivateModels,
  canManageCatalog,
  canViewCatalog,
} from "@/modules/catalog/permissions";
import { isValidSlug, slugifyModelName } from "@/modules/catalog/slug";
import {
  assertCanActivate,
  deriveCalcStatus,
} from "@/modules/catalog/status";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import { buildImmutableSnapshot } from "@/modules/offers/snapshots";
import { nextOfferNumber } from "@/modules/offers/codes";

const createdModelIds: string[] = [];
const createdOfferIds: string[] = [];
const createdCategoryIds: string[] = [];

async function requireUserId(): Promise<string> {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("No seeded user — run db:seed before catalog tests.");
  }
  return user.id;
}

async function requireCategoryId(): Promise<string> {
  const category = await prisma.mirrorModelCategory.findFirst({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
  if (!category) {
    throw new Error("No commercial categories — run db:seed.");
  }
  return category.id;
}

function rectangularConfig(overrides: Record<string, unknown> = {}) {
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

describe("Stage 6.1 catalog helpers", () => {
  it("slugify + validates unique-friendly slugs", () => {
    assert.equal(slugifyModelName("Alla ZERA"), "alla-zera");
    assert.equal(isValidSlug("alla-zera"), true);
    assert.equal(isValidSlug("Alla"), false);
    assert.equal(isValidSlug("a"), false);
  });

  it("ADMIN manages catalog; MANAGER views only", () => {
    assert.equal(canManageCatalog("ADMIN"), true);
    assert.equal(canManageCatalog("MANAGER"), false);
    assert.equal(canViewCatalog("MANAGER"), true);
    assert.equal(canActivateModels("ADMIN"), true);
    assert.equal(canActivateModels("MANAGER"), false);
  });

  it("blocks commercial activation on incomplete calc", () => {
    assert.equal(assertCanActivate("COMPLETE", 600, 800), null);
    assert.match(
      assertCanActivate("INCOMPLETE", 600, 800) ?? "",
      /Calcul incomplet/,
    );
    assert.match(assertCanActivate("COMPLETE", 0, 800) ?? "", /pozitive/);
  });
});

describe("Stage 6.1 mirror models persistence", () => {
  it("creates commercial category (editable, separate from materials)", async () => {
    const userId = await requireUserId();
    const slug = `test-cat-${Date.now()}`;
    const category = await prisma.mirrorModelCategory.create({
      data: {
        name: `Test Cat ${Date.now()}`,
        slug,
        sortOrder: 999,
        createdById: userId,
      },
    });
    createdCategoryIds.push(category.id);
    assert.equal(category.slug, slug);

    const materialSameSlug = await prisma.materialCategory.findUnique({
      where: { slug },
    });
    assert.equal(materialSameSlug, null);
  });

  it("saves complete model with engine prices (no fixed manual price)", async () => {
    const userId = await requireUserId();
    const categoryId = await requireCategoryId();
    const config = rectangularConfig();
    const { calculation, state } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "COMPLETE");
    assert.equal(calculation?.glassCost, 288); // 0.48 m² * 600

    const code = await nextModelCode();
    const row = await prisma.mirrorModel.create({
      data: {
        code,
        name: "Alla",
        slug: `alla-${Date.now()}`,
        categoryId,
        status: "ACTIVE",
        isPublished: false,
        configJson: state as object,
        calculationJson: calculation as object,
        calcStatus: deriveCalcStatus(calculation),
        shapeId: state.shapeId,
        shapeLabel: "Dreptunghiulară",
        glassTypeId: state.glassTypeId,
        defaultWidthMm: new Prisma.Decimal(state.widthMm),
        defaultHeightMm: new Prisma.Decimal(state.heightMm),
        minWidthMm: null,
        maxWidthMm: null,
        minHeightMm: null,
        maxHeightMm: null,
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(row.id);
    assert.equal(row.status, "ACTIVE");
    assert.equal(row.isPublished, false);
    assert.equal(row.calcStatus, "COMPLETE");
    assert.equal(Number(row.sinecost), calculation!.totalProductionCost);
    assert.match(row.code, /^MOD-\d{4}-\d{4}$/);
  });

  it("saves incomplete model as DRAFT with Calcul incomplet", async () => {
    const userId = await requireUserId();
    const categoryId = await requireCategoryId();
    const config = rectangularConfig({ glassTypeId: "bronz" });
    const { calculation, state } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "INCOMPLETE");
    const calcStatus = deriveCalcStatus(calculation);
    assert.equal(calcStatus, "INCOMPLETE");
    assert.ok(assertCanActivate(calcStatus, state.widthMm, state.heightMm));

    const code = await nextModelCode();
    const row = await prisma.mirrorModel.create({
      data: {
        code,
        name: "Draft bronz",
        slug: `draft-bronz-${Date.now()}`,
        categoryId,
        status: "DRAFT",
        isPublished: false,
        configJson: state as object,
        calculationJson: calculation as object,
        calcStatus,
        shapeId: state.shapeId,
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "bronz",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(row.id);
    assert.equal(row.status, "DRAFT");
    assert.equal(row.calcStatus, "INCOMPLETE");
    assert.equal(row.sinecost, null);
  });

  it("duplicates model with new identity and Copie name", async () => {
    const userId = await requireUserId();
    const source = await prisma.mirrorModel.findFirst({
      where: { id: { in: createdModelIds }, status: "ACTIVE" },
    });
    assert.ok(source);
    const code = await nextModelCode();
    const copy = await prisma.mirrorModel.create({
      data: {
        code,
        name: `Copie — ${source!.name}`,
        slug: `copie-${source!.slug}-${Date.now()}`,
        categoryId: source!.categoryId,
        status: "DRAFT",
        isPublished: false,
        configJson: source!.configJson as object,
        calculationJson: source!.calculationJson as object,
        calcStatus: source!.calcStatus,
        shapeId: source!.shapeId,
        shapeLabel: source!.shapeLabel,
        glassTypeId: source!.glassTypeId,
        defaultWidthMm: source!.defaultWidthMm,
        defaultHeightMm: source!.defaultHeightMm,
        sinecost: source!.sinecost,
        wholesalePrice: source!.wholesalePrice,
        retailPrice: source!.retailPrice,
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(copy.id);
    assert.notEqual(copy.id, source!.id);
    assert.notEqual(copy.code, source!.code);
    assert.notEqual(copy.slug, source!.slug);
    assert.ok(copy.name.startsWith("Copie — "));
    assert.equal(copy.status, "DRAFT");
    assert.equal(copy.isPublished, false);
  });

  it("soft-archives and reactivates without hard delete", async () => {
    const source = await prisma.mirrorModel.findFirst({
      where: { id: { in: createdModelIds }, status: "ACTIVE" },
    });
    assert.ok(source);
    const archived = await prisma.mirrorModel.update({
      where: { id: source!.id },
      data: { status: "ARCHIVED", isPublished: false },
    });
    assert.equal(archived.status, "ARCHIVED");
    const stillThere = await prisma.mirrorModel.findUnique({
      where: { id: source!.id },
    });
    assert.ok(stillThere);

    const reactivated = await prisma.mirrorModel.update({
      where: { id: source!.id },
      data: { status: "DRAFT" },
    });
    assert.equal(reactivated.status, "DRAFT");
  });

  it("editing model does not alter issued offer revision prices", async () => {
    const userId = await requireUserId();
    const model = await prisma.mirrorModel.findFirst({
      where: { id: { in: createdModelIds }, calcStatus: "COMPLETE" },
    });
    assert.ok(model);

    const config = model!.configJson as Record<string, unknown>;
    const { state, calculation } = await recalculateFromConfigPayload(config);
    assert.equal(calculation?.status, "COMPLETE");

    const number = await nextOfferNumber();
    const offer = await prisma.customerOffer.create({
      data: {
        number,
        status: "ISSUED",
        mirrorModelId: model!.id,
        clientName: "Client Model",
        clientPhone: "+37360000001",
        productName: model!.name,
        quantity: 1,
        priceTier: "retail",
        validityDays: 14,
        draftConfigJson: config as object,
        draftCalculationJson: calculation as object,
        issuedAt: new Date(),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdOfferIds.push(offer.id);

    const unitPrice = calculation!.retailPrice!;
    const snapshot = buildImmutableSnapshot({
      offerNumber: number,
      revisionNumber: 1,
      state,
      calculation: calculation!,
      client: { name: "Client Model", phone: "+37360000001" },
      productName: model!.name,
      quantity: 1,
      priceTier: "retail",
      unitPrice,
      servicesTotal: 0,
      offerTotal: unitPrice,
      validityDays: 14,
      validUntil: null,
      company: {
        legalName: "ZERA Test",
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

    // Edit model defaults (width) + prices — must not touch revision.
    const nextConfig = { ...config, widthMm: 900, heightMm: 800 };
    const { calculation: afterEdit } =
      await recalculateFromConfigPayload(nextConfig);
    await prisma.mirrorModel.update({
      where: { id: model!.id },
      data: {
        configJson: nextConfig,
        calculationJson: afterEdit as object,
        defaultWidthMm: new Prisma.Decimal(900),
        sinecost: new Prisma.Decimal(afterEdit!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(afterEdit!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(afterEdit!.retailPrice!),
        calcStatus: deriveCalcStatus(afterEdit),
      },
    });

    const revision = await prisma.offerRevision.findFirst({
      where: { offerId: offer.id, revisionNumber: 1 },
    });
    assert.equal(Number(revision!.unitPrice), frozen);
    assert.ok(Number(afterEdit!.retailPrice) !== frozen);
  });

  it("lists with search / status / category filters", async () => {
    const categoryId = await requireCategoryId();
    const byName = await prisma.mirrorModel.findMany({
      where: {
        id: { in: createdModelIds },
        name: { contains: "Alla", mode: "insensitive" },
      },
    });
    assert.ok(byName.length >= 1);

    const byStatus = await prisma.mirrorModel.findMany({
      where: { id: { in: createdModelIds }, status: "DRAFT" },
    });
    assert.ok(byStatus.length >= 1);

    const byCategory = await prisma.mirrorModel.findMany({
      where: { id: { in: createdModelIds }, categoryId },
    });
    assert.ok(byCategory.length >= 1);
  });

  it("preserves Stage 5.1–5.4 lighting through model recalc", async () => {
    const lighting = defaultLightingConfig();
    lighting.lightingType = "back";
    lighting.back.positioning = "two_height";
    lighting.back.temperatureK = 4000;
    const { calculation, state } = await recalculateFromConfigPayload(
      rectangularConfig({ lighting }),
    );
    assert.equal(state.widthMm, 600);
    assert.equal(state.heightMm, 800);
    assert.equal(calculation?.status, "COMPLETE");
    assert.equal(calculation?.glassCost, 288);
    assert.ok((calculation?.electrical?.backLed ?? 0) > 0);
  });

  it("enforces unique slug at DB level", async () => {
    const userId = await requireUserId();
    const categoryId = await requireCategoryId();
    const slug = `unique-slug-${Date.now()}`;
    const code1 = await nextModelCode();
    const first = await prisma.mirrorModel.create({
      data: {
        code: code1,
        name: "Slug A",
        slug,
        categoryId,
        status: "DRAFT",
        configJson: rectangularConfig(),
        calcStatus: "DRAFT",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(first.id);

    const code2 = await nextModelCode();
    await assert.rejects(
      () =>
        prisma.mirrorModel.create({
          data: {
            code: code2,
            name: "Slug B",
            slug,
            categoryId,
            status: "DRAFT",
            configJson: rectangularConfig(),
            calcStatus: "DRAFT",
            shapeId: "rectangular",
            shapeLabel: "Dreptunghiulară",
            glassTypeId: "standard",
            defaultWidthMm: new Prisma.Decimal(600),
            defaultHeightMm: new Prisma.Decimal(800),
            createdById: userId,
            updatedById: userId,
          },
        }),
      /Unique constraint|slug/i,
    );
  });

  it("links model to source saved configuration without merging identity", async () => {
    const userId = await requireUserId();
    const categoryId = await requireCategoryId();
    const config = rectangularConfig();
    const { calculation, state } = await recalculateFromConfigPayload(config);

    const saved = await prisma.savedConfiguration.create({
      data: {
        code: `CFG-TEST-${Date.now()}`,
        name: "Source for model",
        status: "COMPLETE",
        configJson: state as object,
        calculationJson: calculation as object,
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        widthMm: new Prisma.Decimal(600),
        heightMm: new Prisma.Decimal(800),
        glassTypeId: "standard",
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
        createdById: userId,
        updatedById: userId,
      },
    });

    const code = await nextModelCode();
    const model = await prisma.mirrorModel.create({
      data: {
        code,
        name: "From saved",
        slug: `from-saved-${Date.now()}`,
        categoryId,
        status: "DRAFT",
        configJson: state as object,
        calculationJson: calculation as object,
        calcStatus: "COMPLETE",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        sourceConfigurationId: saved.id,
        sinecost: new Prisma.Decimal(calculation!.totalProductionCost!),
        wholesalePrice: new Prisma.Decimal(calculation!.wholesalePrice!),
        retailPrice: new Prisma.Decimal(calculation!.retailPrice!),
        createdById: userId,
        updatedById: userId,
      },
    });
    createdModelIds.push(model.id);
    assert.equal(model.sourceConfigurationId, saved.id);
    assert.notEqual(model.id, saved.id);

    await prisma.savedConfiguration.delete({ where: { id: saved.id } });
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
  if (createdCategoryIds.length > 0) {
    await prisma.mirrorModelCategory.deleteMany({
      where: { id: { in: createdCategoryIds } },
    });
  }
  await prisma.$disconnect();
});
