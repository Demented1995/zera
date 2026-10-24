import { Prisma, type OrderStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import {
  resolveConfiguratorRules,
  validateCustomerConfig,
} from "@/modules/catalog/rules";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import { clearInactiveComponents, coerceConfiguratorState } from "@/modules/catalog/preview/view";
import { summarizeTechFeatures, type OfferTechSummary } from "@/modules/offers/snapshots";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import { nextOrderNumber } from "@/modules/orders/codes";
import { acceptedRetailPrice } from "@/modules/orders/public";

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
  const validated = validateCustomerConfig({
    modelDefault,
    rules,
    request: input.request,
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
  );
  const unitPrice = acceptedRetailPrice(calculation);
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
          note: "Comandă plasată",
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
