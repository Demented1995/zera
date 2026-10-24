import fs from "node:fs/promises";
import path from "node:path";

const BASE_KEY = /^models\/[a-z0-9]+\/[a-z0-9]+$/i;
const FILE_KEY =
  /^models\/[a-z0-9]+\/[a-z0-9]+\/(?:original\.(?:jpg|png|webp)|display\.webp|thumb\.webp)$/i;

export type OriginalExtension = "jpg" | "png" | "webp";
export type ImageVariant = "original" | "display" | "thumb";

export class UnsafeStorageKeyError extends Error {
  constructor(key: string) {
    super("Cheie de stocare invalidă.");
    this.name = "UnsafeStorageKeyError";
    this.key = key;
  }

  readonly key: string;
}

/** Accept only relative POSIX keys we generate. Reject traversal and absolute paths. */
export function assertSafeStorageKey(key: string): string {
  if (typeof key !== "string") {
    throw new UnsafeStorageKeyError(String(key));
  }
  const normalized = key.replace(/\\/g, "/").replace(/^\/+/, "");
  if (
    normalized !== key ||
    normalized.includes("..") ||
    normalized.includes(":") ||
    path.win32.isAbsolute(key) ||
    path.posix.isAbsolute(key) ||
    (!BASE_KEY.test(normalized) && !FILE_KEY.test(normalized))
  ) {
    throw new UnsafeStorageKeyError(key);
  }
  return normalized;
}

export function modelStorageKey(modelId: string, imageId: string): string {
  return assertSafeStorageKey(`models/${modelId}/${imageId}`);
}

export function variantStorageKey(
  storageKey: string,
  variant: ImageVariant,
  originalExt: OriginalExtension,
): string {
  const base = assertSafeStorageKey(storageKey);
  if (!BASE_KEY.test(base)) {
    throw new UnsafeStorageKeyError(storageKey);
  }
  if (variant === "original") {
    return assertSafeStorageKey(`${base}/original.${originalExt}`);
  }
  if (variant === "display") {
    return assertSafeStorageKey(`${base}/display.webp`);
  }
  return assertSafeStorageKey(`${base}/thumb.webp`);
}

export function extensionForMime(mimeType: string): OriginalExtension {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }
  if (mimeType === "image/png") {
    return "png";
  }
  if (mimeType === "image/webp") {
    return "webp";
  }
  throw new UnsafeStorageKeyError(mimeType);
}

export interface ImageStorage {
  put(key: string, body: Buffer): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

export class LocalImageStorage implements ImageStorage {
  constructor(private readonly rootDir: string) {}

  private resolve(key: string): string {
    const safe = assertSafeStorageKey(key);
    const root = path.resolve(this.rootDir);
    const full = path.resolve(root, ...safe.split("/"));
    const relative = path.relative(root, full);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      throw new UnsafeStorageKeyError(key);
    }
    return full;
  }

  async put(key: string, body: Buffer): Promise<void> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, body);
  }

  async read(key: string): Promise<Buffer | null> {
    try {
      return await fs.readFile(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}

export function defaultMediaRoot(): string {
  const configured = process.env.ZERA_MEDIA_DIR?.trim();
  if (!configured) {
    return path.resolve(process.cwd(), "storage", "media");
  }
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

export function createImageStorage(rootDir = defaultMediaRoot()): ImageStorage {
  return new LocalImageStorage(rootDir);
}

export function shouldDeleteStoredFiles(otherReferences: number): boolean {
  return otherReferences === 0;
}
