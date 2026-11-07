import type { MirrorStatus, OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { mediaPath } from "@/modules/catalog/images/service";
import { coerceConfiguratorState } from "@/modules/catalog/preview/view";
import { phoneDigits } from "@/modules/customers/normalize";
import { readMirrorPlacement } from "@/modules/orders/placement";
import { mirrorCode } from "@/modules/orders/public";
import type { OfferTechSummary } from "@/modules/offers/snapshots";

const PAGE_SIZE = 100;

export type OrderListInput = {
  q: string;
  status: OrderStatus | "ALL";
  mirror: MirrorStatus | "ALL";
  page: number;
};

export async function listOrders(input: OrderListInput) {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const q = input.q.trim();
  const digits = phoneDigits(q);
  const where: Prisma.CustomerOrderWhereInput = {
    placedById: { not: null },
    ...(input.status === "ALL" ? {} : { status: input.status }),
    ...(input.mirror === "ALL"
      ? {}
      : {
          OR: [
            { lines: { some: { mirrorStatus: input.mirror } } },
            { AND: [{ lines: { none: {} } }, { mirrorStatus: input.mirror }] },
          ],
        }),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" } },
            { customerName: { contains: q, mode: "insensitive" } },
            { customerPhone: { contains: q, mode: "insensitive" } },
            { modelName: { contains: q, mode: "insensitive" } },
            { modelCode: { contains: q, mode: "insensitive" } },
            ...(digits.length >= 3 ? [{ phoneKey: { contains: digits } }] : []),
          ],
        }
      : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.customerOrder.count({ where }),
    prisma.customerOrder.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        number: true,
        status: true,
        customerName: true,
        customerPhone: true,
        modelName: true,
        modelCode: true,
        mirrorModelId: true,
        summaryJson: true,
        placementJson: true,
        mirrorStatus: true,
        retailPrice: true,
        advanceAmount: true,
        currency: true,
        placedAt: true,
        statusEvents: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { note: true },
        },
        mirrorModel: {
          select: {
            category: { select: { name: true } },
            images: {
              orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
              take: 1,
              select: { id: true },
            },
          },
        },
        lines: {
          ...(input.mirror === "ALL" ? {} : { where: { mirrorStatus: input.mirror } }),
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            modelName: true,
            modelCode: true,
            mirrorModelId: true,
            imageId: true,
            summaryJson: true,
            placementJson: true,
            quantity: true,
            lineTotal: true,
            mirrorStatus: true,
            mirrorModel: {
              select: {
                category: { select: { name: true } },
                images: {
                  orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
                  take: 1,
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    rows,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function getOrder(id: string) {
  return prisma.customerOrder.findUnique({
    where: { id },
    select: {
      id: true,
      number: true,
      status: true,
      mirrorStatus: true,
      customerName: true,
      customerPhone: true,
      deliveryAddress: true,
      modelCode: true,
      modelName: true,
      summaryJson: true,
      retailPrice: true,
      advanceAmount: true,
      currency: true,
      quantity: true,
      placedAt: true,
      placedById: true,
      openedAt: true,
      customer: { select: { id: true, code: true, displayName: true } },
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          mirrorModelId: true,
          modelCode: true,
          modelName: true,
          imageId: true,
          summaryJson: true,
          unitPrice: true,
          quantity: true,
          lineTotal: true,
          mirrorStatus: true,
        },
      },
      statusEvents: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fromStatus: true,
          toStatus: true,
          note: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function listOrderModelChoices() {
  return prisma.mirrorModel.findMany({
    where: {
      status: "ACTIVE",
      isPublished: true,
      calcStatus: "COMPLETE",
      retailPrice: { not: null },
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });
}

export async function getOrderMirror(orderId: string, mirrorKey: string) {
  const order = await prisma.customerOrder.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      number: true,
      placedById: true,
      customerName: true,
      customerPhone: true,
      modelName: true,
      modelCode: true,
      mirrorModelId: true,
      mirrorStatus: true,
      configJson: true,
      placementJson: true,
      retailPrice: true,
      updatedAt: true,
      lines: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          mirrorModelId: true,
          modelName: true,
          modelCode: true,
          imageId: true,
          configJson: true,
          placementJson: true,
          unitPrice: true,
          mirrorStatus: true,
        },
      },
    },
  });
  if (!order?.placedById) {
    return null;
  }
  const line =
    mirrorKey === "principal" ? null : order.lines.find((item) => item.id === mirrorKey) ?? null;
  if (mirrorKey === "principal" ? order.lines.length > 0 : !line) {
    return null;
  }
  const modelId = line?.mirrorModelId ?? order.mirrorModelId;
  let imageId = line?.imageId ?? null;
  if (!imageId && modelId) {
    const image = await prisma.mirrorModelImage.findFirst({
      where: { modelId },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      select: { id: true },
    });
    imageId = image?.id ?? null;
  }
  const config = coerceConfiguratorState(line?.configJson ?? order.configJson);
  const index = line ? order.lines.findIndex((item) => item.id === line.id) + 1 : 1;
  return {
    orderId: order.id,
    number: order.number,
    code: mirrorCode(order.number, index),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    updatedAt: order.updatedAt.toISOString(),
    mirrorKey,
    modelName: line?.modelName ?? order.modelName,
    modelCode: line?.modelCode ?? order.modelCode,
    photoUrl: modelId && imageId ? mediaPath(modelId, imageId, "display") : null,
    config,
    placement: readMirrorPlacement(line?.placementJson ?? order.placementJson),
    mirrorStatus: line?.mirrorStatus ?? order.mirrorStatus,
    canRemove: order.lines.length > 1,
    price: Number(line?.unitPrice ?? order.retailPrice),
  };
}

export function readProjectMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const message = (raw as { projectMessage?: unknown }).projectMessage;
  if (typeof message !== "string") {
    return null;
  }
  const trimmed = message.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function readOrderSummary(raw: unknown): OfferTechSummary | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const value = raw as Partial<OfferTechSummary>;
  if (
    typeof value.shapeLabel !== "string" ||
    typeof value.glassTypeLabel !== "string" ||
    typeof value.lightingLabel !== "string" ||
    !Array.isArray(value.features)
  ) {
    return null;
  }
  return {
    shapeLabel: value.shapeLabel,
    widthMm: Number(value.widthMm),
    heightMm: Number(value.heightMm),
    glassTypeLabel: value.glassTypeLabel,
    lightingLabel: value.lightingLabel,
    features: value.features.filter((item): item is string => typeof item === "string"),
  };
}

const siteRequestSelect = {
  id: true,
  number: true,
  customerName: true,
  customerPhone: true,
  deliveryAddress: true,
  modelName: true,
  modelCode: true,
  retailPrice: true,
  currency: true,
  quantity: true,
  placedAt: true,
  openedAt: true,
  statusEvents: {
    orderBy: { createdAt: "asc" as const },
    take: 1,
    select: { note: true },
  },
} satisfies Prisma.CustomerOrderSelect;

export async function listSiteRequests() {
  return prisma.customerOrder.findMany({
    where: { placedById: null },
    orderBy: { placedAt: "desc" },
    select: siteRequestSelect,
  });
}

export async function countUnopenedSiteRequests(): Promise<number> {
  return prisma.customerOrder.count({
    where: { placedById: null, openedAt: null },
  });
}

export async function markSiteRequestOpened(orderId: string): Promise<void> {
  await prisma.customerOrder.updateMany({
    where: { id: orderId, placedById: null, openedAt: null },
    data: { openedAt: new Date() },
  });
}

export async function listOrdersForCustomer(customerId: string) {
  return prisma.customerOrder.findMany({
    where: { customerId },
    orderBy: { placedAt: "desc" },
    take: 20,
    select: {
      id: true,
      number: true,
      status: true,
      retailPrice: true,
      placedAt: true,
    },
  });
}
