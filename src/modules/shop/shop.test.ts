import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import {
  findPublicSlugRedirect,
  isSellableModel,
  listPublicModels,
  parseCatalogFilters,
  publicImageAllowed,
  publicSaleBlock,
} from "@/modules/shop/catalog";
import { placePublicOrder, quotePublicProduct } from "@/modules/shop/service";
import { jsonForScript } from "@/modules/shop/site";

const createdModelIds: string[] = [];
const createdOrderIds: string[] = [];

function sampleConfig() {
  return {
    shapeId: "rectangular",
    widthMm: 600,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

describe("public shop", () => {
  after(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.customerOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdModelIds.length > 0) {
      await prisma.mirrorModelSlugRedirect.deleteMany({ where: { modelId: { in: createdModelIds } } });
      await prisma.mirrorModel.deleteMany({ where: { id: { in: createdModelIds } } });
    }
    await prisma.$disconnect();
  });

  it("ignores invalid filter numbers and keeps a short query", () => {
    const filters = parseCatalogFilters({
      q: "  oglinda  ",
      latimeMin: "-5",
      pretMax: "nu",
      page: "2",
    });
    assert.equal(filters.q, "oglinda");
    assert.equal(filters.minWidth, null);
    assert.equal(filters.maxPrice, null);
    assert.equal(filters.page, 2);
    assert.match(publicSaleBlock({ status: "DRAFT", calcStatus: "COMPLETE", retailPrice: 10 }) ?? "", /Activ/);
    assert.equal(
      publicSaleBlock({ status: "ACTIVE", calcStatus: "COMPLETE", retailPrice: 10 }),
      null,
    );
    const script = jsonForScript({ name: "</script><script>alert(1)</script>" });
    assert.equal(script.includes("</"), false);
    assert.match(script, /\\u003c/);
  });

  it("lists only active published models and quotes them without internal prices", async () => {
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const category = await prisma.mirrorModelCategory.findFirst();
    assert.ok(user);
    assert.ok(category);
    const stamp = Date.now();
    const sellable = await prisma.mirrorModel.create({
      data: {
        code: `MOD-SHOP-${stamp}`,
        name: `Oglindă publică ${stamp}`,
        slug: `oglinda-publica-${stamp}`,
        categoryId: category.id,
        status: "ACTIVE",
        isPublished: true,
        slugCustomized: true,
        configJson: sampleConfig(),
        calcStatus: "COMPLETE",
        retailPrice: new Prisma.Decimal("489.60"),
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        seoTitle: "Oglindă publică",
        seoDescription: "Descriere publică.",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(sellable.id);
    await prisma.mirrorModelSlugRedirect.create({
      data: { modelId: sellable.id, slug: `vechi-${stamp}` },
    });

    const hidden = await prisma.mirrorModel.create({
      data: {
        code: `MOD-HIDE-${stamp}`,
        name: `Oglindă ascunsă ${stamp}`,
        slug: `oglinda-ascunsa-${stamp}`,
        categoryId: category.id,
        status: "DRAFT",
        isPublished: false,
        slugCustomized: true,
        configJson: sampleConfig(),
        calcStatus: "COMPLETE",
        retailPrice: new Prisma.Decimal("100.00"),
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(hidden.id);

    const listed = await listPublicModels(
      parseCatalogFilters({ q: String(stamp), forma: "rectangular", pretMin: "400", pretMax: "500" }),
    );
    assert.equal(listed.rows.some((row) => row.id === sellable.id), true);
    assert.equal(listed.rows.some((row) => row.id === hidden.id), false);
    assert.equal(await isSellableModel(hidden.id), false);
    assert.equal(await publicImageAllowed(hidden.id, "original"), false);
    assert.equal(await publicImageAllowed(sellable.id, "display"), true);
    assert.equal(await findPublicSlugRedirect(`vechi-${stamp}`), sellable.slug);

    const blocked = await quotePublicProduct({ modelId: hidden.id, request: {} });
    assert.equal(blocked.ok, false);

    const quoted = await quotePublicProduct({ modelId: sellable.id, request: {} });
    assert.equal(quoted.ok, true);
    if (!quoted.ok) {
      return;
    }
    assert.equal(quoted.diagnostic, null);
    assert.equal(quoted.customer.price.available, true);
    assert.equal(findForbiddenCommercialKey(quoted.customer), null);

    const phone = `+3736${String(stamp).slice(-7)}`;
    const before = await prisma.customer.count({ where: { phoneKey: phone.replace(/\D/g, "") } });
    const refused = await placePublicOrder({
      modelId: hidden.id,
      request: {},
      customerName: "Client public",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Publică 1",
    });
    assert.equal(refused.ok, false);

    const placed = await placePublicOrder({
      modelId: sellable.id,
      request: {},
      customerName: "Client public",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Publică 1",
    });
    assert.equal(placed.ok, true);
    if (!placed.ok) {
      return;
    }
    createdOrderIds.push(placed.id);
    assert.match(placed.number, /^CMD-\d{4}-\d{4}$/);
    assert.equal(findForbiddenCommercialKey(placed), null);
    assert.equal(await prisma.customer.count({ where: { phoneKey: phone.replace(/\D/g, "") } }), before);
    const stored = await prisma.customerOrder.findUnique({ where: { id: placed.id } });
    assert.equal(stored?.placedById, null);
    assert.equal(stored?.customerId, null);
  });
});
