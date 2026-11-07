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
import { getOrder, listOrders, listSiteRequests, readOrderSummary } from "@/modules/orders/queries";
import { acceptedRetailPrice, mirrorCode, ONE_CLICK_ADDRESS, orderBalance } from "@/modules/orders/public";
import { parseCustomProject, parseOneClickOrder, parseOrderAdvance, parsePlaceOrder } from "@/modules/orders/schemas";
import {
  addOrderMirror,
  deleteOrder,
  linkOrderCustomer,
  placeOrder,
  removeOrderMirror,
  saveOrderMirror,
  sendSiteRequestToProduction,
  setMirrorStatus,
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
    assert.equal(mirrorCode("CMD-2026-0013", 1), "CMD-2026-0013/1");
    assert.equal(mirrorCode("CMD-2026-0013", 2), "CMD-2026-0013/2");
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
    const oneClick = parseOneClickOrder({
      modelId: base.modelId,
      request: {},
      customerName: "Ana Pop",
      customerPhone: "+37360000000",
    });
    assert.equal(oneClick.ok && oneClick.data.deliveryAddress, ONE_CLICK_ADDRESS);
    const oneClickAddress = parseOneClickOrder({
      modelId: base.modelId,
      request: {},
      customerName: "Ana Pop",
      customerPhone: "+37360000000",
      deliveryAddress: "Str. Test 1",
    });
    assert.equal(oneClickAddress.ok && oneClickAddress.data.deliveryAddress, "Str. Test 1");
    assert.equal(
      parseOneClickOrder({
        modelId: base.modelId,
        request: {},
        customerName: "Ana Pop",
        customerPhone: "+37360000000",
        deliveryAddress: "ab",
      }).ok,
      false,
    );
    const project = parseCustomProject({
      customerName: "Ana Pop",
      customerPhone: "+37360000000",
      message: "Oglindă pentru baie",
    });
    assert.equal(project.ok && project.data.deliveryAddress, "");
    assert.equal(project.ok && project.data.message, "Oglindă pentru baie");
    assert.equal(parseCustomProject({ customerName: "A", customerPhone: "+37360000000" }).ok, false);
    assert.equal(parseOneClickOrder({ ...base, email: "a@b.c" }).ok, false);
    assert.equal(parseOneClickOrder({ modelId: base.modelId, request: {}, customerName: "A", customerPhone: "+37360000000" }).ok, false);
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

    const listed = await listOrders({ q: phone.slice(-8), status: "ALL", mirror: "ALL", page: 1 });
    assert.equal(listed.rows.some((row) => row.id === placed.id), true);
    assert.equal(listed.rows.some((row) => row.id === second.id), false);
    const requests = await listSiteRequests();
    assert.equal(requests.some((row) => row.id === second.id), true);
    const blockedDelete = await deleteOrder(second.id);
    assert.equal(blockedDelete.ok, false);
    assert.ok(await prisma.customerOrder.findUnique({ where: { id: second.id } }));
    const produced = await sendSiteRequestToProduction({ orderId: second.id, staffId: user.id });
    assert.equal(produced.ok, true);
    const producedRow = await prisma.customerOrder.findUnique({ where: { id: second.id } });
    assert.equal(producedRow?.status, "NEW");
    assert.equal(producedRow?.mirrorStatus, "WAITING");
    assert.equal(producedRow?.placedById, user.id);
    assert.equal(Number(producedRow?.retailPrice), second.retailPrice);
    assert.equal(producedRow?.customerName, "Ana Pop");
    const listedAfter = await listOrders({ q: phone.slice(-8), status: "ALL", mirror: "ALL", page: 1 });
    assert.equal(listedAfter.rows.some((row) => row.id === second.id), true);

    const same = await setOrderStatus({
      orderId: placed.id,
      status: "NEW",
      note: null,
      changedById: user.id,
    });
    assert.equal(same.ok, false);
    const moved = await setOrderStatus({
      orderId: placed.id,
      status: "CLOSED_SUCCESS",
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

    const storedConfig = await prisma.customerOrder.findUnique({
      where: { id: placed.id },
      select: { configJson: true },
    });
    const unchanged = await saveOrderMirror({
      orderId: placed.id,
      mirrorKey: "principal",
      config: storedConfig?.configJson,
    });
    assert.equal(unchanged.ok, true);
    if (unchanged.ok) {
      assert.equal(unchanged.price, placed.retailPrice);
    }
    const added = await addOrderMirror({ orderId: placed.id, modelId: model.id });
    assert.equal(added.ok, true);
    const withLines = await prisma.customerOrder.findUnique({
      where: { id: placed.id },
      include: { lines: { orderBy: { sortOrder: "asc" } } },
    });
    assert.equal(withLines?.lines.length, 2);
    assert.equal(Number(withLines?.lines[0]?.unitPrice), placed.retailPrice);
    const mirrorStatus = await setMirrorStatus({
      orderId: placed.id,
      mirrorKey: withLines?.lines[0]?.id ?? "",
      status: "ASSEMBLED",
    });
    assert.equal(mirrorStatus.ok, true);
    const afterStatus = await prisma.customerOrderLine.findUnique({
      where: { id: withLines?.lines[0]?.id ?? "" },
    });
    assert.equal(afterStatus?.mirrorStatus, "ASSEMBLED");
    assert.equal(Number(afterStatus?.unitPrice), placed.retailPrice);
    assert.equal(withLines?.customerName, "Ana Pop");
    const edited = await saveOrderMirror({
      orderId: placed.id,
      mirrorKey: withLines?.lines[1]?.id ?? "",
      config: sampleConfig(1200),
    });
    assert.equal(edited.ok, true);
    if (edited.ok && withLines) {
      assert.notEqual(edited.price, Number(withLines.lines[1]?.unitPrice));
    }
    const afterEdit = await prisma.customerOrder.findUnique({
      where: { id: placed.id },
      include: { lines: true },
    });
    assert.equal(afterEdit?.customerName, "Ana Pop");
    assert.equal(
      Number(afterEdit?.lines.find((line) => line.sortOrder === 0)?.unitPrice),
      placed.retailPrice,
    );
    assert.deepEqual(await removeOrderMirror({ orderId: placed.id, mirrorKey: "principal" }), {
      ok: false,
      message: "Oglinda nu a fost găsită.",
    });
    if (added.ok) {
      const dropped = await removeOrderMirror({ orderId: placed.id, mirrorKey: added.lineId });
      assert.equal(dropped.ok, true);
    }
    const afterDrop = await prisma.customerOrder.findUnique({
      where: { id: placed.id },
      include: { lines: true },
    });
    assert.equal(afterDrop?.lines.length, 1);
    assert.equal(afterDrop?.customerName, "Ana Pop");
    assert.equal(Number(afterDrop?.retailPrice), placed.retailPrice);

    const removed = await deleteOrder(placed.id);
    assert.equal(removed.ok, true);
    assert.equal(await prisma.customerOrder.findUnique({ where: { id: placed.id } }), null);
    assert.equal(await prisma.customerOrderLine.count({ where: { orderId: placed.id } }), 0);
    assert.equal(await prisma.orderStatusEvent.count({ where: { orderId: placed.id } }), 0);
    assert.ok(await prisma.mirrorModel.findUnique({ where: { id: model.id } }));
    assert.ok(await prisma.customer.findUnique({ where: { id: customer.id } }));
    const missing = await deleteOrder("missing-order");
    assert.equal(missing.ok, false);
  });
});
