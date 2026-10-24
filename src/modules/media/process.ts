import sharp from "sharp";

import type { OriginalExtension } from "@/modules/media/storage";

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const DISPLAY_MAX_EDGE = 1600;
export const THUMB_MAX_EDGE = 480;

export class ImageUploadError extends Error {
  constructor(
    public readonly code: "empty" | "size" | "format" | "corrupt",
    message: string,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export type ProcessedImage = {
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  originalExt: OriginalExtension;
  original: Buffer;
  display: Buffer;
  thumb: Buffer;
  widthPx: number;
  heightPx: number;
};

type Detected = {
  mimeType: ProcessedImage["mimeType"];
  originalExt: OriginalExtension;
  sharpFormat: "jpeg" | "png" | "webp";
};

export function detectImageFormat(bytes: Buffer): Detected | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mimeType: "image/jpeg", originalExt: "jpg", sharpFormat: "jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mimeType: "image/png", originalExt: "png", sharpFormat: "png" };
  }
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mimeType: "image/webp", originalExt: "webp", sharpFormat: "webp" };
  }
  return null;
}

function resizeOptions(width: number, height: number, maxEdge: number) {
  if (width <= maxEdge && height <= maxEdge) {
    return null;
  }
  return {
    width: maxEdge,
    height: maxEdge,
    fit: "inside" as const,
    withoutEnlargement: true,
  };
}

export async function processProductImage(bytes: Buffer): Promise<ProcessedImage> {
  if (bytes.length === 0) {
    throw new ImageUploadError("empty", "Fișierul este gol.");
  }
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new ImageUploadError(
      "size",
      "Fișierul depășește limita de 10 MB.",
    );
  }

  const detected = detectImageFormat(bytes);
  if (!detected) {
    throw new ImageUploadError(
      "format",
      "Format neacceptat. Folosiți JPEG, PNG sau WebP.",
    );
  }

  try {
    const meta = await sharp(bytes, { failOn: "error" }).metadata();
    const widthPx = meta.autoOrient?.width ?? meta.width;
    const heightPx = meta.autoOrient?.height ?? meta.height;
    if (
      meta.format !== detected.sharpFormat ||
      !widthPx ||
      !heightPx ||
      widthPx < 1 ||
      heightPx < 1
    ) {
      throw new ImageUploadError(
        "format",
        "Conținutul fișierului nu este o imagine JPEG, PNG sau WebP validă.",
      );
    }

    const displayResize = resizeOptions(widthPx, heightPx, DISPLAY_MAX_EDGE);
    const thumbResize = resizeOptions(widthPx, heightPx, THUMB_MAX_EDGE);
    let display = sharp(bytes, { failOn: "error" }).rotate();
    let thumb = sharp(bytes, { failOn: "error" }).rotate();
    if (displayResize) {
      display = display.resize(displayResize);
    }
    if (thumbResize) {
      thumb = thumb.resize(thumbResize);
    }

    const [displayBuffer, thumbBuffer] = await Promise.all([
      display.webp({ quality: 82 }).toBuffer(),
      thumb.webp({ quality: 76 }).toBuffer(),
    ]);

    return {
      mimeType: detected.mimeType,
      originalExt: detected.originalExt,
      original: bytes,
      display: displayBuffer,
      thumb: thumbBuffer,
      widthPx,
      heightPx,
    };
  } catch (error) {
    if (error instanceof ImageUploadError) {
      throw error;
    }
    throw new ImageUploadError(
      "corrupt",
      "Imaginea nu a putut fi citită.",
    );
  }
}
