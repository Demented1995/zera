import type { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { phoneDigits } from "@/modules/customers/normalize";
import type { OfferTechSummary } from "@/modules/offers/snapshots";

const PAGE_SIZE = 20;

export type OrderListInput = {
  q: string;
  status: OrderStatus | "ALL";
  page: number;
};

export async function listOrders(input: OrderListInput) {
  const page = Number.isFinite(input.page) && input.page > 0 ? Math.floor(input.page) : 1;
  const q = input.q.trim();
  const digits = phoneDigits(q);
  const where: Prisma.CustomerOrderWhereInput = {
    ...(input.status === "ALL" ? {} : { status: input.status }),
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
        retailPrice: true,
        advanceAmount: true,
        currency: true,
        placedAt: true,
        _count: { select: { lines: true } },
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
