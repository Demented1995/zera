import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { defaultConfiguratorRules } from "@/modules/catalog/rules";
import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { resetCheckoutLimits } from "@/modules/shop/abuse";
import { addCartLine, type CartDraft } from "@/modules/shop/cart";
import { parseCartCheckout, type CheckoutData } from "@/modules/shop/checkout";
import { placeCartOrder } from "@/modules/shop/service";
import { quoteOrderConfiguration } from "@/modules/orders/service";

const createdModelIds: string[] = [];
const createdOrderIds: string[] = [];

function sampleConfig(widthMm = 600) {
  return {
    shapeId: "rectangular",
    widthMm,
    heightMm: 800,
    glassTypeId: "standard",
    manualEdgeAddsMm: { left: 0, right: 0, top: 0, bottom: 0 },
    lighting: defaultLightingConfig(),
    processing: defaultProcessingConfig(),
    commercial: defaultCommercialConfig(),
  };
}

function editableRules() {
  const rules = defaultConfiguratorRules();
  rules.dimensions.width = { mode: "EDITABLE", minMm: 400, maxMm: 1200, stepMm: 50 };
  rules.features.width = { mode: "EDITABLE", allowedValues: [] };
  return rules;
}

function draft(modelId: string, widthMm: number): CartDraft {
  return {
    modelId,
    slug: "oglinda",
    name: "Oglindă",
    imageSrc: null,
    imageAlt: "Oglindă",
    selection: widthMm === 600 ? {} : { widthMm },
    summary: [`Lățime: ${widthMm} mm`],
    unitPrice: 1,
  };
}

describe("shopping cart checkout", () => {
  after(async () => {
    resetCheckoutLimits();
    if (createdOrderIds.length > 0) {
      await prisma.customerOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdModelIds.length > 0) {
      await prisma.mirrorModel.deleteMany({ where: { id: { in: createdModelIds } } });
    }
    await prisma.$disconnect();
  });

  it("merges the same configuration and keeps a different one", () => {
    const first = addCartLine([], draft("model-a", 600));
    const second = addCartLine(first.lines, draft("model-a", 600));
    const third = addCartLine(second.lines, draft("model-a", 700));
    assert.equal(second.result, "updated");
    assert.equal(second.lines[0]?.quantity, 2);
    assert.equal(third.result, "added");
    assert.equal(third.lines.length, 2);
  });

  it("rejects spam, extra prices, and quantities above 20", () => {
    const base = {
      lines: [
        {
          lineId: "line-0001",
          modelId: "cmvmu8a4w0001ukckrohxl742",
          request: {},
          quantity: 1,
          expectedUnitPrice: 10,
        },
      ],
      customerName: "Client coș",
      customerPhone: "+373 69 000 991",
      deliveryAddress: "Str. Coșului 2",
      idempotencyKey: randomUUID(),
      honeypot: "",
      startedAt: Date.now() - 5_000,
    };
    assert.equal(parseCartCheckout({ ...base, quantity: 99, retailPrice: 1 }).ok, false);
    assert.equal(parseCartCheckout({ ...base, lines: [{ ...base.lines[0], quantity: 21 }] }).ok, false);
    assert.equal(parseCartCheckout({ ...base, lines: [{ ...base.lines[0], request: { sinecost: 1 } }] }).ok, false);
    const honeypot = parseCartCheckout({ ...base, honeypot: "bot" });
    assert.equal(honeypot.ok, true);
    if (honeypot.ok) {
      assert.equal(honeypot.data.honeypot, "bot");
    }
  });

  it("recalculates every line, freezes the total, and ignores a repeated submit", async () => {
    resetCheckoutLimits();
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const category = await prisma.mirrorModelCategory.findFirst();
    assert.ok(user);
    assert.ok(category);
    const stamp = Date.now();
    const sellable = await prisma.mirrorModel.create({
      data: {
        code: `MOD-CART-${stamp}`,
        name: `Oglindă coș ${stamp}`,
        slug: `oglinda-cos-${stamp}`,
        categoryId: category.id,
        status: "ACTIVE",
        isPublished: true,
        slugCustomized: true,
        configJson: sampleConfig(),
        configuratorRulesJson: editableRules(),
        calcStatus: "COMPLETE",
        retailPrice: new Prisma.Decimal("489.60"),
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(sellable.id);
    const hidden = await prisma.mirrorModel.create({
      data: {
        code: `MOD-CART-H-${stamp}`,
        name: `Oglindă coș ascunsă ${stamp}`,
        slug: `oglinda-cos-ascunsa-${stamp}`,
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

    const narrow = await quoteOrderConfiguration({ modelId: sellable.id, request: {} });
    const wide = await quoteOrderConfiguration({ modelId: sellable.id, request: { widthMm: 700 } });
    assert.equal(narrow.ok, true);
    assert.equal(wide.ok, true);
    if (!narrow.ok || !wide.ok) {
      return;
    }
    assert.notEqual(narrow.quote.unitPrice, wide.quote.unitPrice);

    const phone = `+37369${String(stamp).slice(-6)}`;
    const phoneKey = phone.replace(/\D/g, "");
    const customersBefore = await prisma.customer.count({ where: { phoneKey } });
    const contact = {
      customerName: "Client coș",
      customerPhone: { display: phone, key: phoneKey },
      deliveryAddress: "Str. Coșului 2, Chișinău",
      honeypot: "",
      startedAt: Date.now() - 5_000,
    };

    const fast = await placeCartOrder({
      ...contact,
      startedAt: Date.now(),
      idempotencyKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          modelId: sellable.id,
          request: {},
          quantity: 2,
          expectedUnitPrice: narrow.quote.unitPrice,
        },
      ],
    });
    assert.equal(fast.ok, false);

    const hiddenOrder = await placeCartOrder({
      ...contact,
      idempotencyKey: randomUUID(),
      lines: [
        {
          lineId: randomUUID(),
          modelId: hidden.id,
          request: {},
          quantity: 1,
          expectedUnitPrice: 100,
        },
      ],
    });
    assert.equal(hiddenOrder.ok, false);

    const lineA = randomUUID();
    const lineB = randomUUID();
    const changed = await placeCartOrder({
      ...contact,
      idempotencyKey: randomUUID(),
      lines: [
        {
          lineId: lineA,
          modelId: sellable.id,
          request: {},
          quantity: 2,
          expectedUnitPrice: 1,
        },
        {
          lineId: lineB,
          modelId: sellable.id,
          request: { widthMm: 700 },
          quantity: 1,
          expectedUnitPrice: wide.quote.unitPrice,
        },
      ],
    });
    assert.equal(changed.ok, false);
    if (changed.ok || changed.code !== "PRICE_CHANGED") {
      return;
    }
    assert.equal(changed.updates.length, 1);
    assert.equal(changed.updates[0]?.unitPrice, narrow.quote.unitPrice);
    assert.equal(await prisma.customerOrder.count({ where: { phoneKey } }), 0);

    const key = randomUUID();
    const payload: CheckoutData = {
      ...contact,
      idempotencyKey: key,
      lines: [
        {
          lineId: lineA,
          modelId: sellable.id,
          request: {},
          quantity: 2,
          expectedUnitPrice: narrow.quote.unitPrice,
        },
        {
          lineId: lineB,
          modelId: sellable.id,
          request: { widthMm: 700 },
          quantity: 1,
          expectedUnitPrice: wide.quote.unitPrice,
        },
      ],
    };
    const placed = await placeCartOrder(payload);
    assert.equal(placed.ok, true);
    if (!placed.ok) {
      return;
    }
    assert.equal(findForbiddenCommercialKey(placed), null);
    const again = await placeCartOrder(payload);
    assert.deepEqual(again, placed);

    const stored = await prisma.customerOrder.findUnique({
      where: { idempotencyKey: key },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    assert.ok(stored);
    if (!stored) {
      return;
    }
    createdOrderIds.push(stored.id);
    assert.equal(stored.status, "NEW");
    assert.equal(stored.placedById, null);
    assert.equal(stored.customerId, null);
    assert.equal(stored.quantity, 3);
    assert.equal(stored.lines.length, 2);
    assert.equal(Number(stored.lines[0]?.unitPrice), narrow.quote.unitPrice);
    assert.equal(Number(stored.lines[0]?.quantity), 2);
    assert.equal(Number(stored.lines[1]?.unitPrice), wide.quote.unitPrice);
    assert.equal(await prisma.customerOrder.count({ where: { idempotencyKey: key } }), 1);
    const expectedTotal =
      Math.round((narrow.quote.unitPrice * 2 + wide.quote.unitPrice) * 100) / 100;
    assert.equal(Number(stored.retailPrice), expectedTotal);
    assert.equal(findForbiddenCommercialKey(stored.summaryJson), null);
    assert.equal(findForbiddenCommercialKey(stored.lines[0]?.summaryJson), null);
    assert.equal(await prisma.customer.count({ where: { phoneKey } }), customersBefore);

    const spam = await placeCartOrder({
      ...payload,
      idempotencyKey: randomUUID(),
      honeypot: "https://spam.example",
    });
    assert.equal(spam.ok, false);
    assert.equal(await prisma.customerOrder.count({ where: { phoneKey } }), 1);
  });
});
