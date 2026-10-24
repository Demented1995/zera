import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, describe, it } from "node:test";

import { Prisma } from "@prisma/client";
import sharp from "sharp";

import {
  deleteModelImage,
  reorderImageIds,
  reorderModelImages,
  replacementPrimaryId,
  updateModelImage,
  uploadModelImage,
} from "@/modules/catalog/images/service";
import {
  canManageModelImages,
  canViewModelImages,
} from "@/modules/catalog/permissions";
import { prisma } from "@/lib/db/prisma";
import {
  detectImageFormat,
  ImageUploadError,
  MAX_IMAGE_BYTES,
  processProductImage,
} from "@/modules/media/process";
import {
  assertSafeStorageKey,
  LocalImageStorage,
  shouldDeleteStoredFiles,
  UnsafeStorageKeyError,
  variantStorageKey,
} from "@/modules/media/storage";

const createdModelIds: string[] = [];

async function sample(format: "jpeg" | "png" | "webp", width = 40, height = 20) {
  const base = sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 180, g: 40, b: 40 },
    },
  });
  if (format === "jpeg") {
    return base.jpeg().toBuffer();
  }
  if (format === "png") {
    return base.png().toBuffer();
  }
  return base.webp().toBuffer();
}

describe("product image processing and storage", () => {
  it("accepts JPEG, PNG, and WebP and rejects other formats", async () => {
    const jpeg = await sample("jpeg");
    const png = await sample("png");
    const webp = await sample("webp");
    assert.equal(detectImageFormat(jpeg)?.mimeType, "image/jpeg");
    assert.equal(detectImageFormat(png)?.mimeType, "image/png");
    assert.equal(detectImageFormat(webp)?.mimeType, "image/webp");

    for (const bytes of [jpeg, png, webp]) {
      const processed = await processProductImage(bytes);
      assert.equal(processed.display.subarray(0, 4).toString("ascii"), "RIFF");
      assert.equal(processed.display.subarray(8, 12).toString("ascii"), "WEBP");
      assert.equal(processed.thumb.subarray(8, 12).toString("ascii"), "WEBP");
      assert.equal(processed.widthPx, 40);
      assert.equal(processed.heightPx, 20);
    }

    assert.equal(detectImageFormat(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>")), null);
    await assert.rejects(
      () => processProductImage(Buffer.from("GIF89a")),
      (error: unknown) => error instanceof ImageUploadError && error.code === "format",
    );
    await assert.rejects(
      () => processProductImage(Buffer.from("plain text")),
      (error: unknown) => error instanceof ImageUploadError && error.code === "format",
    );
  });

  it("rejects files over 10 MB and does not enlarge small photos", async () => {
    await assert.rejects(
      () => processProductImage(Buffer.alloc(MAX_IMAGE_BYTES + 1, 1)),
      (error: unknown) => error instanceof ImageUploadError && error.code === "size",
    );

    const small = await sample("png", 12, 8);
    const processed = await processProductImage(small);
    const displayMeta = await sharp(processed.display).metadata();
    const thumbMeta = await sharp(processed.thumb).metadata();
    assert.equal(displayMeta.width, 12);
    assert.equal(displayMeta.height, 8);
    assert.equal(thumbMeta.width, 12);
    assert.equal(thumbMeta.height, 8);
  });

  it("applies EXIF orientation without stretching", async () => {
    const landscape = await sharp({
      create: {
        width: 30,
        height: 10,
        channels: 3,
        background: { r: 1, g: 2, b: 3 },
      },
    })
      .jpeg()
      .toBuffer();
    const oriented = await sharp(landscape).withMetadata({ orientation: 6 }).toBuffer();
    const processed = await processProductImage(oriented);
    assert.equal(processed.widthPx, 10);
    assert.equal(processed.heightPx, 30);
    const display = await sharp(processed.display).metadata();
    assert.equal(display.width, 10);
    assert.equal(display.height, 30);
  });

  it("rejects unsafe storage keys and keeps files readable after a new storage instance", async () => {
    assert.throws(() => assertSafeStorageKey("../etc/passwd"), UnsafeStorageKeyError);
    assert.throws(() => assertSafeStorageKey("C:/Windows/note.jpg"), UnsafeStorageKeyError);
    assert.throws(
      () => assertSafeStorageKey("models/abc/def/../../secret"),
      UnsafeStorageKeyError,
    );
    const key = variantStorageKey("models/abc123/def456", "thumb", "jpg");
    assert.equal(key, "models/abc123/def456/thumb.webp");

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zera-media-"));
    const first = new LocalImageStorage(dir);
    await first.put(key, Buffer.from("webp-bytes"));
    const second = new LocalImageStorage(dir);
    const read = await second.read(key);
    assert.equal(read?.toString(), "webp-bytes");
    await fs.rm(dir, { recursive: true, force: true });
  });

  it("reorders only a complete permutation and promotes a new primary after delete", () => {
    assert.deepEqual(reorderImageIds(["a", "b", "c"], ["c", "a", "b"]), ["c", "a", "b"]);
    assert.equal(reorderImageIds(["a", "b"], ["a"]), null);
    assert.equal(reorderImageIds(["a", "b"], ["a", "a"]), null);
    assert.equal(
      replacementPrimaryId(
        [
          { id: "a", sortOrder: 0, isPrimary: true },
          { id: "b", sortOrder: 1, isPrimary: false },
        ],
        "a",
      ),
      "b",
    );
    assert.equal(shouldDeleteStoredFiles(0), true);
    assert.equal(shouldDeleteStoredFiles(1), false);
    assert.equal(canManageModelImages("ADMIN"), true);
    assert.equal(canManageModelImages("MANAGER"), false);
    assert.equal(canViewModelImages("MANAGER"), true);
    assert.equal(canViewModelImages("ADMIN"), true);
  });

  it("stores optimized files, sets a single primary, reorders, and deletes shared files once", async () => {
    const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
    const category = await prisma.mirrorModelCategory.findFirst();
    assert.ok(user);
    assert.ok(category);

    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "zera-gallery-"));
    const storage = new LocalImageStorage(dir);
    const model = await prisma.mirrorModel.create({
      data: {
        code: `MOD-IMG-${Date.now()}`,
        name: "Galerie test",
        slug: `galerie-test-${Date.now()}`,
        categoryId: category.id,
        status: "DRAFT",
        configJson: {
          shapeId: "rectangular",
          widthMm: 600,
          heightMm: 800,
          glassTypeId: "standard",
        },
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

    const jpeg = await uploadModelImage(
      { db: prisma, storage },
      {
        modelId: model.id,
        userId: user.id,
        bytes: await sample("jpeg"),
        kind: "SECONDARY",
        altText: "Față",
        internalNote: "notă internă",
        originalName: "foto.jpg",
      },
    );
    const png = await uploadModelImage(
      { db: prisma, storage },
      {
        modelId: model.id,
        userId: user.id,
        bytes: await sample("png", 80, 40),
        kind: "DETAIL",
        altText: "Detaliu",
        internalNote: "",
        originalName: "detaliu.png",
      },
    );
    assert.equal(jpeg.isPrimary, true);
    assert.equal(png.isPrimary, false);
    assert.equal(jpeg.internalNote, "notă internă");

    const thumbKey = variantStorageKey(jpeg.id ? `models/${model.id}/${jpeg.id}` : "", "thumb", "jpg");
    const reopened = new LocalImageStorage(dir);
    const thumb = await reopened.read(thumbKey);
    assert.ok(thumb);
    assert.equal(thumb.subarray(8, 12).toString("ascii"), "WEBP");
    const display = await reopened.read(
      variantStorageKey(`models/${model.id}/${jpeg.id}`, "display", "jpg"),
    );
    assert.equal(display?.subarray(8, 12).toString("ascii"), "WEBP");

    const primary = await updateModelImage(prisma, {
      modelId: model.id,
      imageId: png.id,
      isPrimary: true,
    });
    assert.equal(primary?.isPrimary, true);
    const primaries = await prisma.mirrorModelImage.count({
      where: { modelId: model.id, isPrimary: true },
    });
    assert.equal(primaries, 1);

    const ordered = await reorderModelImages(prisma, model.id, [png.id, jpeg.id]);
    assert.deepEqual(
      ordered?.map((image) => image.id),
      [png.id, jpeg.id],
    );

    const shared = await prisma.mirrorModelImage.create({
      data: {
        modelId: model.id,
        kind: "AMBIENT",
        isPrimary: false,
        sortOrder: 5,
        storageKey: `models/${model.id}/${jpeg.id}`,
        originalName: "shared.jpg",
        mimeType: "image/jpeg",
        widthPx: 40,
        heightPx: 20,
        byteSize: 10,
        uploadedById: user.id,
      },
    });
    assert.equal(await deleteModelImage({ db: prisma, storage }, model.id, jpeg.id), true);
    assert.ok(
      await reopened.read(variantStorageKey(`models/${model.id}/${jpeg.id}`, "original", "jpg")),
    );
    assert.equal(await deleteModelImage({ db: prisma, storage }, model.id, shared.id), true);
    assert.equal(
      await reopened.read(variantStorageKey(`models/${model.id}/${jpeg.id}`, "original", "jpg")),
      null,
    );

    await fs.rm(dir, { recursive: true, force: true });
  });
});

after(async () => {
  if (createdModelIds.length > 0) {
    await prisma.mirrorModel.deleteMany({ where: { id: { in: createdModelIds } } });
  }
  await prisma.$disconnect();
});
