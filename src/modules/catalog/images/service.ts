import { randomUUID } from "node:crypto";

import type { MirrorImageKind, Prisma, PrismaClient, Role } from "@prisma/client";

import { canManageModelImages } from "@/modules/catalog/permissions";
import {
  ImageUploadError,
  processProductImage,
} from "@/modules/media/process";
import {
  createImageStorage,
  extensionForMime,
  modelStorageKey,
  shouldDeleteStoredFiles,
  variantStorageKey,
  type ImageStorage,
} from "@/modules/media/storage";

export const IMAGE_KINDS = ["SECONDARY", "DETAIL", "AMBIENT"] as const;

export type ModelImageRecord = {
  id: string;
  modelId: string;
  kind: MirrorImageKind;
  isPrimary: boolean;
  sortOrder: number;
  altText: string;
  internalNote: string;
  storageKey: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  createdAt: Date;
};

const imageSelect = {
  id: true,
  modelId: true,
  kind: true,
  isPrimary: true,
  sortOrder: true,
  altText: true,
  internalNote: true,
  storageKey: true,
  mimeType: true,
  widthPx: true,
  heightPx: true,
  byteSize: true,
  createdAt: true,
} satisfies Prisma.MirrorModelImageSelect;

export function mediaPath(
  modelId: string,
  imageId: string,
  variant: "display" | "thumb",
): string {
  return `/api/media/${modelId}/${imageId}/${variant}`;
}

export function toImageDto(image: ModelImageRecord) {
  return {
    id: image.id,
    modelId: image.modelId,
    kind: image.kind,
    isPrimary: image.isPrimary,
    sortOrder: image.sortOrder,
    altText: image.altText,
    internalNote: image.internalNote,
    widthPx: image.widthPx,
    heightPx: image.heightPx,
    byteSize: image.byteSize,
    createdAt: image.createdAt.toISOString(),
    thumbUrl: mediaPath(image.modelId, image.id, "thumb"),
    displayUrl: mediaPath(image.modelId, image.id, "display"),
  };
}

export type ModelImageDto = ReturnType<typeof toImageDto>;

export function sanitizeText(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "image";
  const cleaned = base.replace(/[^\w.\- ]+/g, "").trim().slice(0, 120);
  return cleaned || "image";
}

export function parseImageKind(value: unknown): MirrorImageKind {
  if (value === "DETAIL" || value === "AMBIENT" || value === "SECONDARY") {
    return value;
  }
  return "SECONDARY";
}

export function reorderImageIds(currentIds: string[], requestedIds: string[]): string[] | null {
  if (requestedIds.length !== currentIds.length) {
    return null;
  }
  if (new Set(requestedIds).size !== requestedIds.length) {
    return null;
  }
  const current = new Set(currentIds);
  if (requestedIds.some((id) => !current.has(id))) {
    return null;
  }
  return requestedIds;
}

export function replacementPrimaryId(
  images: Array<{ id: string; sortOrder: number; isPrimary: boolean }>,
  deletedId: string,
): string | null {
  const remaining = images
    .filter((image) => image.id !== deletedId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (remaining.length === 0) {
    return null;
  }
  const deleted = images.find((image) => image.id === deletedId);
  if (!deleted?.isPrimary) {
    return null;
  }
  return remaining[0]?.id ?? null;
}

type Deps = {
  db: PrismaClient;
  storage?: ImageStorage;
};

function createdPlaceholderKey(): string {
  return randomUUID().replace(/-/g, "");
}

function storageOf(deps: Deps): ImageStorage {
  return deps.storage ?? createImageStorage();
}

export async function listModelImages(db: PrismaClient, modelId: string) {
  const rows = await db.mirrorModelImage.findMany({
    where: { modelId },
    select: imageSelect,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toImageDto);
}

export async function uploadModelImage(
  deps: Deps,
  input: {
    modelId: string;
    userId: string;
    bytes: Buffer;
    kind: MirrorImageKind;
    altText: string;
    internalNote: string;
    originalName: string;
  },
): Promise<ModelImageDto> {
  const model = await deps.db.mirrorModel.findUnique({
    where: { id: input.modelId },
    select: { id: true },
  });
  if (!model) {
    throw new ImageUploadError("corrupt", "Modelul nu a fost găsit.");
  }

  const processed = await processProductImage(input.bytes);
  const existingCount = await deps.db.mirrorModelImage.count({
    where: { modelId: input.modelId },
  });
  const last = await deps.db.mirrorModelImage.findFirst({
    where: { modelId: input.modelId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const created = await deps.db.mirrorModelImage.create({
    data: {
      modelId: input.modelId,
      kind: input.kind,
      isPrimary: existingCount === 0,
      sortOrder: (last?.sortOrder ?? -1) + 1,
      altText: sanitizeText(input.altText, 300),
      internalNote: sanitizeText(input.internalNote, 1000),
      storageKey: `pending-${createdPlaceholderKey()}`,
      originalName: sanitizeFileName(input.originalName),
      mimeType: processed.mimeType,
      widthPx: processed.widthPx,
      heightPx: processed.heightPx,
      byteSize: processed.original.length,
      uploadedById: input.userId,
    },
    select: imageSelect,
  });

  const storageKey = modelStorageKey(input.modelId, created.id);
  await deps.db.mirrorModelImage.update({
    where: { id: created.id },
    data: { storageKey },
  });
  const storage = storageOf(deps);
  try {
    await storage.put(
      variantStorageKey(storageKey, "original", processed.originalExt),
      processed.original,
    );
    await storage.put(variantStorageKey(storageKey, "display", processed.originalExt), processed.display);
    await storage.put(variantStorageKey(storageKey, "thumb", processed.originalExt), processed.thumb);
  } catch (error) {
    await storage.delete(variantStorageKey(storageKey, "original", processed.originalExt));
    await storage.delete(variantStorageKey(storageKey, "display", processed.originalExt));
    await storage.delete(variantStorageKey(storageKey, "thumb", processed.originalExt));
    await deps.db.mirrorModelImage.delete({ where: { id: created.id } });
    throw error;
  }

  const saved = await deps.db.mirrorModelImage.update({
    where: { id: created.id },
    data: { storageKey },
    select: imageSelect,
  });
  return toImageDto(saved);
}

export async function updateModelImage(
  db: PrismaClient,
  input: {
    modelId: string;
    imageId: string;
    altText?: string;
    internalNote?: string;
    kind?: MirrorImageKind;
    isPrimary?: boolean;
  },
): Promise<ModelImageDto | null> {
  const current = await db.mirrorModelImage.findFirst({
    where: { id: input.imageId, modelId: input.modelId },
    select: { id: true },
  });
  if (!current) {
    return null;
  }

  if (input.isPrimary) {
    await db.$transaction(async (tx) => {
      await tx.mirrorModelImage.updateMany({
        where: { modelId: input.modelId, isPrimary: true },
        data: { isPrimary: false },
      });
      await tx.mirrorModelImage.update({
        where: { id: input.imageId },
        data: { isPrimary: true },
      });
    });
  }

  const saved = await db.mirrorModelImage.update({
    where: { id: input.imageId },
    data: {
      altText: input.altText === undefined ? undefined : sanitizeText(input.altText, 300),
      internalNote:
        input.internalNote === undefined
          ? undefined
          : sanitizeText(input.internalNote, 1000),
      kind: input.kind,
    },
    select: imageSelect,
  });
  return toImageDto(saved);
}

export async function reorderModelImages(
  db: PrismaClient,
  modelId: string,
  requestedIds: string[],
): Promise<ModelImageDto[] | null> {
  const current = await db.mirrorModelImage.findMany({
    where: { modelId },
    select: { id: true },
    orderBy: { sortOrder: "asc" },
  });
  const order = reorderImageIds(
    current.map((image) => image.id),
    requestedIds,
  );
  if (!order) {
    return null;
  }
  await db.$transaction(
    order.map((id, index) =>
      db.mirrorModelImage.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );
  return listModelImages(db, modelId);
}

export async function deleteModelImage(
  deps: Deps,
  modelId: string,
  imageId: string,
): Promise<boolean> {
  const images = await deps.db.mirrorModelImage.findMany({
    where: { modelId },
    select: {
      id: true,
      sortOrder: true,
      isPrimary: true,
      storageKey: true,
      mimeType: true,
    },
  });
  const target = images.find((image) => image.id === imageId);
  if (!target) {
    return false;
  }

  const promoteId = replacementPrimaryId(images, imageId);
  await deps.db.$transaction(async (tx) => {
    await tx.mirrorModelImage.delete({ where: { id: imageId } });
    if (promoteId) {
      await tx.mirrorModelImage.updateMany({
        where: { modelId, isPrimary: true },
        data: { isPrimary: false },
      });
      await tx.mirrorModelImage.update({
        where: { id: promoteId },
        data: { isPrimary: true },
      });
    }
  });

  const otherReferences = await deps.db.mirrorModelImage.count({
    where: { storageKey: target.storageKey },
  });
  if (shouldDeleteStoredFiles(otherReferences)) {
    const storage = storageOf(deps);
    const ext = extensionForMime(target.mimeType);
    await storage.delete(variantStorageKey(target.storageKey, "original", ext));
    await storage.delete(variantStorageKey(target.storageKey, "display", ext));
    await storage.delete(variantStorageKey(target.storageKey, "thumb", ext));
  }
  return true;
}

export function assertCanManageImages(role: Role): boolean {
  return canManageModelImages(role);
}
