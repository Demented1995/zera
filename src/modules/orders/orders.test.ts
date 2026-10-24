import "dotenv/config";
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { defaultCommercialConfig } from "@/modules/configurator/commercial";
import { defaultLightingConfig } from "@/modules/configurator/lighting";
import { defaultProcessingConfig } from "@/modules/configurator/processing";
import { parseCustomerInput } from "@/modules/customers/schemas";
import { saveCustomer } from "@/modules/customers/service";
import { canManageOrders } from "@/modules/orders/permissions";
import { getOrder, listOrders, readOrderSummary } from "@/modules/orders/queries";
import { acceptedRetailPrice, orderBalance } from "@/modules/orders/public";
import { parseOrderAdvance, parsePlaceOrder } from "@/modules/orders/schemas";
import {
  linkOrderCustomer,
  placeOrder,
  setOrderAdvance,
  setOrderStatus,
} from "@/modules/orders/service";

const createdOrderIds: string[] = [];
const createdModelIds: string[] = [];
const createdCustomerIds: string[] = [];

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

describe("orders", () => {
  after(async () => {
    if (createdOrderIds.length > 0) {
      await prisma.customerOrder.deleteMany({ where: { id: { in: createdOrderIds } } });
    }
    if (createdModelIds.length > 0) {
      await prisma.mirrorModel.deleteMany({ where: { id: { in: createdModelIds } } });
    }
    if (createdCustomerIds.length > 0) {
      await prisma.customer.deleteMany({ where: { id: { in: createdCustomerIds } } });
    }
    await prisma.$disconnect();
  });

  it("accepts both staff roles and only a complete retail price", () => {
    assert.equal(canManageOrders("ADMIN"), true);
    assert.equal(canManageOrders("MANAGER"), true);
    assert.equal(acceptedRetailPrice(null), null);
    assert.equal(acceptedRetailPrice({ status: "INCOMPLETE", retailPrice: 10 }), null);
    assert.equal(acceptedRetailPrice({ status: "COMPLETE", retailPrice: null }), null);
    assert.equal(acceptedRetailPrice({ status: "COMPLETE", retailPrice: 489.6 }), 489.6);
    assert.equal(orderBalance(489.6, 100), 389.6);
  });

  it("rejects passwords, registration fields, and a client-supplied price", () => {
    const base = {
      modelId: "cmvmu8a4w0001ukckrohxl742",
      request: {},
      customerName: "Ana Pop",
      customerPhone: "+37360000000",
      deliveryAddress: "Str. Test 1",
    };
    assert.equal(parsePlaceOrder({ ...base, retailPrice: 1 }).ok, false);
    assert.equal(parsePlaceOrder({ ...base, password: "secret" }).ok, false);
    assert.equal(parsePlaceOrder({ ...base, email: "a@b.c" }).ok, false);
    assert.equal(parsePlaceOrder({ ...base, customerName: "A" }).ok, false);
    assert.equal(parsePlaceOrder({ ...base, customerPhone: "123" }).ok, false);
    assert.equal(parsePlaceOrder({ ...base, deliveryAddress: "ab" }).ok, false);
    const tagged = parsePlaceOrder({ ...base, customerName: "<b>Ana</b> Pop" });
    assert.equal(tagged.ok && tagged.data.customerName, "Ana Pop");
    assert.equal(parseOrderAdvance({ orderId: "x", advanceAmount: 10.555 }).ok, false);
  });

  it("freezes the priced configuration and does not create a customer", async () => {
    const user = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const category = await prisma.mirrorModelCategory.findFirst();
    assert.ok(user);
    assert.ok(category);
    const stamp = Date.now();
    const phone = `+373${String(stamp).slice(-8)}`;
    const model = await prisma.mirrorModel.create({
      data: {
        code: `MOD-ORD-${stamp}`,
        name: "Oglindă comandă",
        slug: `oglinda-comanda-${stamp}`,
        categoryId: category.id,
        status: "DRAFT",
        slugCustomized: false,
        configJson: sampleConfig(),
        calcStatus: "DRAFT",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(model.id);

    const archived = await prisma.mirrorModel.create({
      data: {
        code: `MOD-ARC-${stamp}`,
        name: "Oglindă arhivată",
        slug: `oglinda-arhivata-${stamp}`,
        categoryId: category.id,
        status: "ARCHIVED",
        slugCustomized: false,
        configJson: sampleConfig(),
        calcStatus: "DRAFT",
        shapeId: "rectangular",
        shapeLabel: "Dreptunghiulară",
        glassTypeId: "standard",
        defaultWidthMm: new Prisma.Decimal(600),
        defaultHeightMm: new Prisma.Decimal(800),
        createdById: user.id,
        updatedById: user.id,
      },
    });
    createdModelIds.push(archived.id);

    const before = await prisma.customer.count({
      where: { phoneKey: phone.replace(/\D/g, "") },
    });
    const blocked = await placeOrder({
      modelId: archived.id,
      request: {},
      customerName: "Ana Pop",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Test 1, Chișinău",
      placedById: user.id,
    });
    assert.equal(blocked.ok, false);

    const rejected = await placeOrder({
      modelId: model.id,
      request: { widthMm: 700 },
      customerName: "Ana Pop",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Test 1, Chișinău",
      placedById: user.id,
    });
    assert.equal(rejected.ok, false);

    const placed = await placeOrder({
      modelId: model.id,
      request: {},
      customerName: "Ana Pop",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Test 1, Chișinău",
      placedById: user.id,
    });
    assert.equal(placed.ok, true);
    if (!placed.ok) {
      return;
    }
    createdOrderIds.push(placed.id);
    assert.match(placed.number, /^CMD-\d{4}-\d{4}$/);
    assert.equal(findForbiddenCommercialKey(placed), null);
    assert.equal(
      await prisma.customer.count({ where: { phoneKey: phone.replace(/\D/g, "") } }),
      before,
    );

    const second = await placeOrder({
      modelId: model.id,
      request: {},
      customerName: "Ana Pop",
      customerPhone: { display: phone, key: phone.replace(/\D/g, "") },
      deliveryAddress: "Str. Test 1, Chișinău",
      placedById: null,
    });
    assert.equal(second.ok, true);
    if (!second.ok) {
      return;
    }
    createdOrderIds.push(second.id);
    assert.notEqual(second.number, placed.number);

    await prisma.mirrorModel.update({
      where: { id: model.id },
      data: { name: "Nume schimbat", configJson: sampleConfig(900) },
    });

    const stored = await getOrder(placed.id);
    assert.ok(stored);
    assert.equal("configJson" in stored, false);
    assert.equal(stored.modelName, "Oglindă comandă");
    assert.equal(Number(stored.retailPrice), placed.retailPrice);
    const summary = readOrderSummary(stored.summaryJson);
    assert.equal(summary?.widthMm, 600);
    assert.equal(findForbiddenCommercialKey(summary), null);

    const listed = await listOrders({ q: phone.slice(-8), status: "ALL", page: 1 });
    assert.equal(listed.rows.some((row) => row.id === placed.id), true);

    const same = await setOrderStatus({
      orderId: placed.id,
      status: "NEW",
      note: null,
      changedById: user.id,
    });
    assert.equal(same.ok, false);
    const moved = await setOrderStatus({
      orderId: placed.id,
      status: "CONFIRMED",
      note: "Confirmată telefonic",
      changedById: user.id,
    });
    assert.equal(moved.ok, true);
    const tooMuch = await setOrderAdvance({ orderId: placed.id, advanceAmount: placed.retailPrice + 1 });
    assert.equal(tooMuch.ok, false);
    const advance = await setOrderAdvance({ orderId: placed.id, advanceAmount: 100 });
    assert.equal(advance.ok, true);

    const updated = await prisma.customerOrder.findUnique({
      where: { id: placed.id },
      include: { statusEvents: true },
    });
    assert.equal(Number(updated?.retailPrice), placed.retailPrice);
    assert.equal(Number(updated?.advanceAmount), 100);
    assert.equal(
      orderBalance(Number(updated?.retailPrice), Number(updated?.advanceAmount)),
      orderBalance(placed.retailPrice, 100),
    );
    assert.equal(updated?.statusEvents.length, 2);

    const parsedCustomer = parseCustomerInput({
      kind: "INDIVIDUAL",
      displayName: "Registru separat",
      phone: `+3737${String(stamp).slice(-7)}`,
      email: "",
      companyName: "",
      idno: "",
      contactName: "",
      notes: "",
      addresses: [],
    });
    assert.equal(parsedCustomer.ok, true);
    if (!parsedCustomer.ok) {
      return;
    }
    const customer = await saveCustomer(parsedCustomer.data, user.id);
    assert.equal(customer.ok, true);
    if (!customer.ok) {
      return;
    }
    createdCustomerIds.push(customer.id);
    const otherParsed = parseCustomerInput({
      kind: "INDIVIDUAL",
      displayName: "Alt registru",
      phone: `+3738${String(stamp).slice(-7)}`,
      email: "",
      companyName: "",
      idno: "",
      contactName: "",
      notes: "",
      addresses: [],
    });
    assert.equal(otherParsed.ok, true);
    if (!otherParsed.ok) {
      return;
    }
    const other = await saveCustomer(otherParsed.data, user.id);
    assert.equal(other.ok, true);
    if (!other.ok) {
      return;
    }
    createdCustomerIds.push(other.id);

    const linked = await linkOrderCustomer({
      orderId: placed.id,
      customerCode: (await prisma.customer.findUniqueOrThrow({ where: { id: customer.id } })).code,
    });
    assert.equal(linked.ok, true);
    const refused = await linkOrderCustomer({
      orderId: placed.id,
      customerCode: (await prisma.customer.findUniqueOrThrow({ where: { id: other.id } })).code,
    });
    assert.equal(refused.ok, false);
    const afterLink = await prisma.customerOrder.findUnique({ where: { id: placed.id } });
    assert.equal(afterLink?.customerName, "Ana Pop");
    assert.equal(afterLink?.customerPhone, phone);
    assert.equal(afterLink?.customerId, customer.id);
  });
});
