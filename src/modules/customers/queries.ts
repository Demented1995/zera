import type { CustomerKind, CustomerStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { phoneDigits } from "@/modules/customers/normalize";

export const CUSTOMER_PAGE_SIZE = 20;

export type CustomerListQuery = {
  q?: string;
  kind?: CustomerKind | "ALL";
  status?: CustomerStatus | "ALL";
  sort?: "updatedAt" | "displayName" | "createdAt";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

const listSelect = {
  id: true,
  code: true,
  kind: true,
  status: true,
  displayName: true,
  phone: true,
  email: true,
  companyName: true,
  updatedAt: true,
  addresses: {
    orderBy: [{ isPrimary: "desc" as const }, { sortOrder: "asc" as const }],
    take: 1,
    select: { line: true, city: true },
  },
  _count: { select: { offers: true } },
} satisfies Prisma.CustomerSelect;

export async function listCustomers(options: CustomerListQuery = {}) {
  const pageSize = options.pageSize ?? CUSTOMER_PAGE_SIZE;
  const where: Prisma.CustomerWhereInput = {};
  if (options.status && options.status !== "ALL") {
    where.status = options.status;
  }
  if (options.kind && options.kind !== "ALL") {
    where.kind = options.kind;
  }
  const q = options.q?.trim() ?? "";
  if (q) {
    const digits = phoneDigits(q);
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
      { contactName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { idno: { contains: q } },
      { code: { contains: q, mode: "insensitive" } },
      ...(digits.length >= 3 ? [{ phoneKey: { contains: digits } }] : []),
    ];
  }

  const sort = options.sort ?? "updatedAt";
  const order = options.order ?? "desc";
  const total = await prisma.customer.count({ where });
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, options.page ?? 1), pages);

  const rows = await prisma.customer.findMany({
    where,
    select: listSelect,
    orderBy: { [sort]: order },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return { rows, total, page, pages, pageSize };
}

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }] },
      createdBy: { select: { name: true, email: true } },
      updatedBy: { select: { name: true, email: true } },
    },
  });
}

export async function listCustomerOffers(customerId: string) {
  return prisma.customerOffer.findMany({
    where: { customerId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: {
      id: true,
      number: true,
      status: true,
      clientName: true,
      clientPhone: true,
      productName: true,
      updatedAt: true,
    },
  });
}

export async function findUnlinkedOfferMatches(input: {
  phoneKey: string;
  emailKey: string | null;
}) {
  const digits = phoneDigits(input.phoneKey);
  const tail = digits.slice(-8);
  const or: Prisma.CustomerOfferWhereInput[] = [];
  if (tail.length >= 8) {
    or.push({ clientPhone: { contains: tail } });
  }
  if (input.emailKey) {
    or.push({ clientEmail: { equals: input.emailKey, mode: "insensitive" } });
  }
  if (or.length === 0) {
    return [];
  }
  return prisma.customerOffer.findMany({
    where: { customerId: null, OR: or },
    orderBy: { updatedAt: "desc" },
    take: 8,
    select: {
      id: true,
      number: true,
      status: true,
      clientName: true,
      clientPhone: true,
      clientEmail: true,
      productName: true,
    },
  });
}
