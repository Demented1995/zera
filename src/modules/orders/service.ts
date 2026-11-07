import { Prisma, type MirrorStatus, type OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  resolveConfiguratorRules,
  validateCustomerConfig,
} from "@/modules/catalog/rules";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import { clearInactiveComponents, coerceConfiguratorState } from "@/modules/catalog/preview/view";
import { summarizeTechFeatures, type OfferTechSummary } from "@/modules/offers/snapshots";
import type { MirrorPlacement } from "@/modules/orders/placement";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import { loadCatalogMaterialsForEngine } from "@/modules/pricing/queries";
import { nextOrderNumber } from "@/modules/orders/codes";
import { acceptedPayablePrice, CUSTOM_PROJECT_CODE } from "@/modules/orders/public";

export type OrderMutation =
  | { ok: true; id: string; number: string; retailPrice: number; currency: "MDL" }
  | { ok: false; message: string };

export type QuotedOrderLine = {
  modelId: string;
  modelCode: string;
  modelName: string;
  imageId: string | null;
  pricedConfig: ConfiguratorState;
  summary: OfferTechSummary;
  unitPrice: number;
};

/** Server price for one configuration. Ignores any price sent by the client. */
export async function quoteOrderConfiguration(input: {
  modelId: string;
  request: CustomerConfigRequest;
}): Promise<{ ok: true; quote: QuotedOrderLine } | { ok: false; message: string }> {
  const model = await prisma.mirrorModel.findUnique({
    where: { id: input.modelId },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      configJson: true,
      configuratorRulesJson: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!model) {
    return { ok: false, message: "Modelul nu a fost găsit." };
  }
  if (model.status === "ARCHIVED") {
    return { ok: false, message: "Modelul arhivat nu poate fi comandat." };
  }

  const modelDefault = coerceConfiguratorState(model.configJson);
  if (!modelDefault) {
    return { ok: false, message: "Configurația tehnică a modelului este incompletă." };
  }

  const rules = resolveConfiguratorRules(model.configuratorRulesJson);
  const materials = await loadCatalogMaterialsForEngine();
  const validated = validateCustomerConfig({
    modelDefault,
    rules,
    request: input.request,
    materials,
    customerZerosUnset: true,
  });
  if (!validated.ok || validated.rejected.length > 0) {
    return {
      ok: false,
      message: validated.rejected[0]?.message ?? "Configurația nu este acceptată.",
    };
  }

  const pricedConfig = clearInactiveComponents(validated.config);
  const { calculation } = await recalculateFromConfigPayload(
    pricedConfig as unknown as Record<string, unknown>,
    { zeroUnsetSwitchPrice: true },
  );
  const unitPrice = acceptedPayablePrice(calculation);
  if (unitPrice == null) {
    return { ok: false, message: "Preț indisponibil momentan." };
  }

  return {
    ok: true,
    quote: {
      modelId: model.id,
      modelCode: model.code,
      modelName: model.name,
      imageId: model.images[0]?.id ?? null,
      pricedConfig,
      summary: summarizeTechFeatures(pricedConfig),
      unitPrice,
    },
  };
}

export async function placeOrder(input: {
  modelId: string;
  request: CustomerConfigRequest;
  customerName: string;
  customerPhone: { display: string; key: string };
  deliveryAddress: string;
  placedById: string | null;
  statusNote?: string;
}): Promise<OrderMutation> {
  const quoted = await quoteOrderConfiguration({
    modelId: input.modelId,
    request: input.request,
  });
  if (!quoted.ok) {
    return quoted;
  }
  const { quote } = quoted;
  const number = await nextOrderNumber();
  const created = await prisma.customerOrder.create({
    data: {
      number,
      status: "NEW",
      customerName: input.customerName,
      customerPhone: input.customerPhone.display,
      phoneKey: input.customerPhone.key,
      deliveryAddress: input.deliveryAddress,
      mirrorModelId: quote.modelId,
      modelCode: quote.modelCode,
      modelName: quote.modelName,
      configJson: quote.pricedConfig as unknown as Prisma.InputJsonValue,
      summaryJson: quote.summary as unknown as Prisma.InputJsonValue,
      retailPrice: quote.unitPrice,
      currency: "MDL",
      advanceAmount: 0,
      quantity: 1,
      placedById: input.placedById,
      statusEvents: {
        create: {
          fromStatus: null,
          toStatus: "NEW",
          note: input.statusNote ?? "Comandă plasată",
          changedById: input.placedById,
        },
      },
    },
    select: { id: true, number: true, retailPrice: true },
  });

  return {
    ok: true,
    id: created.id,
    number: created.number,
    retailPrice: Number(created.retailPrice),
    currency: "MDL",
  };
}

export async function sendSiteRequestToProduction(input: {
  orderId: string;
  staffId: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, placedById: true, status: true, openedAt: true, modelCode: true },
  });
  if (!order) {
    return { ok: false, message: "Solicitarea nu a fost găsită." };
  }
  if (order.modelCode === CUSTOM_PROJECT_CODE) {
    return { ok: false, message: "Proiectul personalizat se discută înainte de producere." };
  }
  if (order.placedById) {
    return { ok: false, message: "Comanda este deja înregistrată." };
  }
  if (order.status !== "NEW") {
    return { ok: false, message: "Solicitarea nu mai poate intra în producție." };
  }

  await prisma.$transaction([
    prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        placedById: input.staffId,
        mirrorStatus: "WAITING",
        ...(order.openedAt ? {} : { openedAt: new Date() }),
      },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: "NEW",
        note: "Trimisă la producere",
        changedById: input.staffId,
      },
    }),
  ]);
  return { ok: true };
}

export async function setOrderStatus(input: {
  orderId: string;
  status: OrderStatus;
  note: string | null;
  changedById: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, status: true },
  });
  if (!order) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  if (order.status === input.status) {
    return { ok: false, message: "Comanda are deja acest status." };
  }

  await prisma.$transaction([
    prisma.customerOrder.update({
      where: { id: order.id },
      data: { status: input.status },
    }),
    prisma.orderStatusEvent.create({
      data: {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: input.status,
        note: input.note,
        changedById: input.changedById,
      },
    }),
  ]);
  return { ok: true };
}

/** Changes one mirror's production status. Price and configuration stay. */
export async function setMirrorStatus(input: {
  orderId: string;
  mirrorKey: string;
  status: MirrorStatus;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      placedById: true,
      mirrorStatus: true,
      lines: { select: { id: true, mirrorStatus: true } },
    },
  });
  if (!order?.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  if (input.mirrorKey === "principal") {
    if (order.lines.length > 0) {
      return { ok: false, message: "Deschide oglinda din listă." };
    }
    if (order.mirrorStatus !== input.status) {
      await prisma.customerOrder.update({
        where: { id: order.id },
        data: { mirrorStatus: input.status },
      });
    }
    return { ok: true };
  }
  const line = order.lines.find((item) => item.id === input.mirrorKey);
  if (!line) {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  if (line.mirrorStatus !== input.status) {
    await prisma.customerOrderLine.update({
      where: { id: line.id },
      data: { mirrorStatus: input.status },
    });
  }
  return { ok: true };
}

export async function setOrderAdvance(input: {
  orderId: string;
  advanceAmount: number;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, retailPrice: true },
  });
  if (!order) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  const retail = Number(order.retailPrice);
  if (input.advanceAmount > retail) {
    return { ok: false, message: "Avansul nu poate depăși prețul comenzii." };
  }
  await prisma.customerOrder.update({
    where: { id: order.id },
    data: { advanceAmount: input.advanceAmount },
  });
  return { ok: true };
}

export async function linkOrderCustomer(input: {
  orderId: string;
  customerCode: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const [order, customer] = await Promise.all([
    prisma.customerOrder.findUnique({
      where: { id: input.orderId },
      select: { id: true, customerId: true },
    }),
    prisma.customer.findUnique({
      where: { code: input.customerCode },
      select: { id: true },
    }),
  ]);
  if (!order) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  if (!customer) {
    return { ok: false, message: "Clientul din registru nu a fost găsit." };
  }
  if (order.customerId && order.customerId !== customer.id) {
    return { ok: false, message: "Comanda este deja asociată altui client." };
  }
  if (order.customerId === customer.id) {
    return { ok: true };
  }
  await prisma.customerOrder.update({
    where: { id: order.id },
    data: { customerId: customer.id },
  });
  return { ok: true };
}

/** Removes a registered order. Lines and status history go with it. The customer and the model stay. */
export async function deleteOrder(
  orderId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    select: { id: true, placedById: true },
  });
  if (!order || !order.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  await prisma.customerOrder.delete({ where: { id: order.id } });
  return { ok: true };
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

async function primaryImageId(modelId: string | null): Promise<string | null> {
  if (!modelId) {
    return null;
  }
  const image = await prisma.mirrorModelImage.findFirst({
    where: { modelId },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    select: { id: true },
  });
  return image?.id ?? null;
}

async function quoteEditedMirror(
  config: unknown,
): Promise<{ ok: true; state: ConfiguratorState; summary: OfferTechSummary; price: number } | { ok: false; message: string }> {
  const coerced = coerceConfiguratorState(config);
  if (!coerced) {
    return { ok: false, message: "Configurația este incompletă." };
  }
  const state = clearInactiveComponents(coerced);
  const quoted = await recalculateFromConfigPayload(state as unknown as Record<string, unknown>, {
    zeroUnsetSwitchPrice: true,
  });
  const price = acceptedPayablePrice(quoted.calculation);
  if (price == null) {
    return {
      ok: false,
      message: quoted.blockers[0] ?? "Prețul nu poate fi calculat pentru acești parametri.",
    };
  }
  return { ok: true, state, summary: summarizeTechFeatures(state), price };
}

/** Saves one mirror on a registered order and reprices only that mirror. */
export async function saveOrderMirror(input: {
  orderId: string;
  mirrorKey: string;
  config: unknown;
}): Promise<{ ok: true; price: number } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      placedById: true,
      advanceAmount: true,
      quantity: true,
      lines: { select: { id: true, sortOrder: true, lineTotal: true, quantity: true } },
    },
  });
  if (!order?.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  const quoted = await quoteEditedMirror(input.config);
  if (!quoted.ok) {
    return quoted;
  }
  const configJson = quoted.state as unknown as Prisma.InputJsonValue;
  const summaryJson = quoted.summary as unknown as Prisma.InputJsonValue;

  if (input.mirrorKey === "principal") {
    if (order.lines.length > 0) {
      return { ok: false, message: "Deschide oglinda din listă." };
    }
    const total = money(quoted.price * order.quantity);
    if (Number(order.advanceAmount) > total) {
      return { ok: false, message: "Avansul este mai mare decât noul preț." };
    }
    await prisma.customerOrder.update({
      where: { id: order.id },
      data: { configJson, summaryJson, retailPrice: total },
    });
    return { ok: true, price: quoted.price };
  }

  const line = order.lines.find((item) => item.id === input.mirrorKey);
  if (!line) {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const lineTotal = money(quoted.price * line.quantity);
  const nextTotal = money(
    order.lines.reduce((sum, item) => sum + (item.id === line.id ? lineTotal : Number(item.lineTotal)), 0),
  );
  if (Number(order.advanceAmount) > nextTotal) {
    return { ok: false, message: "Avansul este mai mare decât noul preț." };
  }
  const header =
    line.sortOrder === Math.min(...order.lines.map((item) => item.sortOrder))
      ? { configJson, summaryJson }
      : {};
  await prisma.$transaction([
    prisma.customerOrderLine.update({
      where: { id: line.id },
      data: { configJson, summaryJson, unitPrice: quoted.price, lineTotal },
    }),
    prisma.customerOrder.update({
      where: { id: order.id },
      data: { ...header, retailPrice: nextTotal },
    }),
  ]);
  return { ok: true, price: quoted.price };
}

/** Saves workshop placement for one mirror. The price and the configuration stay as they are. */
export async function saveMirrorPlacement(input: {
  orderId: string;
  mirrorKey: string;
  placement: MirrorPlacement;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: { id: true, placedById: true, lines: { select: { id: true } } },
  });
  if (!order?.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  const placementJson = input.placement as unknown as Prisma.InputJsonValue;
  if (input.mirrorKey === "principal") {
    if (order.lines.length > 0) {
      return { ok: false, message: "Deschide oglinda din listă." };
    }
    await prisma.customerOrder.update({
      where: { id: order.id },
      data: { placementJson },
    });
    return { ok: true };
  }
  const line = order.lines.find((item) => item.id === input.mirrorKey);
  if (!line) {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  await prisma.customerOrderLine.update({
    where: { id: line.id },
    data: { placementJson },
  });
  return { ok: true };
}

/** Adds another mirror to a registered order. The mirrors already saved keep their price. */
export async function addOrderMirror(input: {
  orderId: string;
  modelId: string;
}): Promise<{ ok: true; lineId: string } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      placedById: true,
      mirrorModelId: true,
      mirrorStatus: true,
      modelCode: true,
      modelName: true,
      configJson: true,
      summaryJson: true,
      placementJson: true,
      retailPrice: true,
      quantity: true,
      lines: { select: { id: true, sortOrder: true, lineTotal: true, quantity: true } },
    },
  });
  if (!order?.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  const quoted = await quoteOrderConfiguration({ modelId: input.modelId, request: {} });
  if (!quoted.ok) {
    return quoted;
  }
  const created = await prisma.$transaction(async (tx) => {
    if (order.lines.length === 0) {
      await tx.customerOrderLine.create({
        data: {
          orderId: order.id,
          sortOrder: 0,
          mirrorModelId: order.mirrorModelId,
          modelCode: order.modelCode,
          modelName: order.modelName,
          imageId: await primaryImageId(order.mirrorModelId),
          configJson: order.configJson as Prisma.InputJsonValue,
          summaryJson: order.summaryJson as Prisma.InputJsonValue,
          placementJson:
            order.placementJson == null
              ? Prisma.JsonNull
              : (order.placementJson as Prisma.InputJsonValue),
          unitPrice: order.retailPrice,
          quantity: order.quantity,
          lineTotal: money(Number(order.retailPrice) * order.quantity),
          mirrorStatus: order.mirrorStatus,
        },
      });
    }
    const sortOrder =
      order.lines.length === 0 ? 1 : Math.max(...order.lines.map((item) => item.sortOrder)) + 1;
    const line = await tx.customerOrderLine.create({
      data: {
        orderId: order.id,
        sortOrder,
        mirrorModelId: quoted.quote.modelId,
        modelCode: quoted.quote.modelCode,
        modelName: quoted.quote.modelName,
        imageId: quoted.quote.imageId,
        configJson: quoted.quote.pricedConfig as unknown as Prisma.InputJsonValue,
        summaryJson: quoted.quote.summary as unknown as Prisma.InputJsonValue,
        unitPrice: quoted.quote.unitPrice,
        quantity: 1,
        lineTotal: quoted.quote.unitPrice,
        mirrorStatus: "WAITING",
      },
      select: { id: true },
    });
    const lines = await tx.customerOrderLine.findMany({
      where: { orderId: order.id },
      select: { lineTotal: true, quantity: true },
    });
    await tx.customerOrder.update({
      where: { id: order.id },
      data: {
        retailPrice: money(lines.reduce((sum, item) => sum + Number(item.lineTotal), 0)),
        quantity: lines.reduce((sum, item) => sum + item.quantity, 0),
      },
    });
    return line;
  });
  return { ok: true, lineId: created.id };
}

/** Removes one mirror when the order has at least two. The customer stays. */
export async function removeOrderMirror(input: {
  orderId: string;
  mirrorKey: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: input.orderId },
    select: {
      id: true,
      placedById: true,
      advanceAmount: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          mirrorModelId: true,
          modelCode: true,
          modelName: true,
          configJson: true,
          summaryJson: true,
          placementJson: true,
          lineTotal: true,
          quantity: true,
        },
      },
    },
  });
  if (!order?.placedById) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  if (order.lines.length < 2) {
    return { ok: false, message: "Comanda are o singură oglindă. Puteți șterge comanda." };
  }
  const line = order.lines.find((item) => item.id === input.mirrorKey);
  if (!line) {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const remaining = order.lines.filter((item) => item.id !== line.id);
  const first = remaining[0];
  if (!first) {
    return { ok: false, message: "Oglinda nu a fost găsită." };
  }
  const total = money(remaining.reduce((sum, item) => sum + Number(item.lineTotal), 0));
  if (Number(order.advanceAmount) > total) {
    return { ok: false, message: "Avansul este mai mare decât prețul rămas." };
  }
  await prisma.$transaction([
    prisma.customerOrderLine.delete({ where: { id: line.id } }),
    prisma.customerOrder.update({
      where: { id: order.id },
      data: {
        mirrorModelId: first.mirrorModelId,
        modelCode: first.modelCode,
        modelName: first.modelName,
        configJson: first.configJson as Prisma.InputJsonValue,
        summaryJson: first.summaryJson as Prisma.InputJsonValue,
        placementJson:
          first.placementJson == null
            ? Prisma.JsonNull
            : (first.placementJson as Prisma.InputJsonValue),
        retailPrice: total,
        quantity: remaining.reduce((sum, item) => sum + item.quantity, 0),
      },
    }),
  ]);
  return { ok: true };
}

export async function unlinkOrderCustomer(
  orderId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!order) {
    return { ok: false, message: "Comanda nu a fost găsită." };
  }
  await prisma.customerOrder.update({
    where: { id: order.id },
    data: { customerId: null },
  });
  return { ok: true };
}
