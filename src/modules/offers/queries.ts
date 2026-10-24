import type { ConfigStatus, OfferStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { resolveOfferDisplayStatus } from "@/modules/offers/status";

export async function listSavedConfigurations(options: {
  q?: string;
  status?: ConfigStatus | "ALL";
  sort?: "updatedAt" | "name" | "code" | "sinecost" | "retailPrice";
  order?: "asc" | "desc";
}) {
  const where: Prisma.SavedConfigurationWhereInput = {};
  if (options.status && options.status !== "ALL") {
    where.status = options.status;
  }
  if (options.q?.trim()) {
    const q = options.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
      { shapeLabel: { contains: q, mode: "insensitive" } },
    ];
  }

  const sort = options.sort ?? "updatedAt";
  const order = options.order ?? "desc";

  return prisma.savedConfiguration.findMany({
    where,
    orderBy: { [sort]: order },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
    },
  });
}

export async function getSavedConfiguration(id: string) {
  return prisma.savedConfiguration.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      offers: {
        select: { id: true, number: true, status: true, issuedAt: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });
}

export async function listOffers(options?: { status?: OfferStatus | "ALL" }) {
  const where: Prisma.CustomerOfferWhereInput = {};
  if (options?.status && options.status !== "ALL") {
    where.status = options.status;
  }
  const rows = await prisma.customerOffer.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      configuration: { select: { id: true, code: true, name: true } },
      revisions: {
        orderBy: { revisionNumber: "desc" },
        take: 1,
        select: {
          revisionNumber: true,
          offerTotal: true,
          unitPrice: true,
          issuedAt: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    ...row,
    displayStatus: resolveOfferDisplayStatus(row.status, row.validUntil),
  }));
}

export async function getOffer(id: string) {
  const offer = await prisma.customerOffer.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      updatedBy: { select: { id: true, name: true, email: true } },
      configuration: true,
      customer: { select: { id: true, code: true, displayName: true } },
      revisions: {
        orderBy: { revisionNumber: "desc" },
        include: {
          issuedBy: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });
  if (!offer) {
    return null;
  }
  return {
    ...offer,
    displayStatus: resolveOfferDisplayStatus(offer.status, offer.validUntil),
  };
}
