import { createHash, randomBytes } from "node:crypto";

import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { customerConfigRequestSchema } from "@/modules/catalog/rules/schemas";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import { isSellableModel } from "@/modules/shop/catalog";

const TOKEN_BYTES = 9;

export function canonicalConfigurationRequest(raw: unknown): CustomerConfigRequest | null {
  const parsed = customerConfigRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return null;
  }
  const next: CustomerConfigRequest = { ...parsed.data };
  if (next.accessoryIds) {
    next.accessoryIds = [...next.accessoryIds].sort();
  }
  if (next.logoIds) {
    next.logoIds = [...next.logoIds].sort();
  }
  if (next.cutouts?.length === 0) {
    delete next.cutouts;
  }
  if (next.accessoryIds?.length === 0) {
    delete next.accessoryIds;
  }
  if (next.logoIds?.length === 0) {
    delete next.logoIds;
  }
  return next;
}

export function configurationRequestHash(request: CustomerConfigRequest): string {
  return createHash("sha256").update(stableStringify(request)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function newToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function createConfigurationLink(input: {
  modelId: string;
  request: unknown;
}): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
  const request = canonicalConfigurationRequest(input.request);
  if (!request) {
    return { ok: false, message: "Datele cererii sunt invalide." };
  }
  const model = await prisma.mirrorModel.findUnique({
    where: { id: input.modelId },
    select: { id: true, slug: true },
  });
  if (!model || !(await isSellableModel(model.id))) {
    return { ok: false, message: "Modelul nu este disponibil." };
  }
  if (Object.keys(request).length === 0) {
    return { ok: true, path: `/catalog/${model.slug}` };
  }

  const requestHash = configurationRequestHash(request);
  const existing = await prisma.configurationLink.findUnique({
    where: { mirrorModelId_requestHash: { mirrorModelId: model.id, requestHash } },
    select: { token: true },
  });
  if (existing) {
    return { ok: true, path: `/catalog/${model.slug}?c=${existing.token}` };
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const created = await prisma.configurationLink.create({
        data: {
          token: newToken(),
          mirrorModelId: model.id,
          requestJson: request as Prisma.InputJsonValue,
          requestHash,
        },
        select: { token: true },
      });
      return { ok: true, path: `/catalog/${model.slug}?c=${created.token}` };
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
        throw error;
      }
      const raced = await prisma.configurationLink.findUnique({
        where: { mirrorModelId_requestHash: { mirrorModelId: model.id, requestHash } },
        select: { token: true },
      });
      if (raced) {
        return { ok: true, path: `/catalog/${model.slug}?c=${raced.token}` };
      }
    }
  }
  return { ok: false, message: "Linkul nu a putut fi creat." };
}

export async function readSharedConfiguration(
  token: string,
  modelId: string,
): Promise<CustomerConfigRequest | null> {
  const clean = token.trim();
  if (!clean || clean.length > 32) {
    return null;
  }
  const row = await prisma.configurationLink.findUnique({
    where: { token: clean },
    select: { mirrorModelId: true, requestJson: true },
  });
  if (!row || row.mirrorModelId !== modelId) {
    return null;
  }
  return canonicalConfigurationRequest(row.requestJson);
}
