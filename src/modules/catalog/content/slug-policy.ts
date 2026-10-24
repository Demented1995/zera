import type { Prisma, PrismaClient } from "@prisma/client";

import { isValidSlug, slugifyModelName } from "@/modules/catalog/slug";

type Db = PrismaClient | Prisma.TransactionClient;

/** First path segments already used by the app or reserved for the future shop. */
export const RESERVED_MODEL_SLUGS = new Set([
  "admin",
  "api",
  "assets",
  "catalog",
  "categorii",
  "cautare",
  "checkout",
  "clienti",
  "comenzi",
  "configurator",
  "configuratii",
  "cont",
  "cos",
  "dashboard",
  "descriere",
  "fotografii",
  "login",
  "magazin",
  "materiale",
  "media",
  "modele",
  "nou",
  "oferta",
  "oferte",
  "preturi",
  "previzualizare",
  "produse",
  "public",
  "ro",
  "ru",
  "search",
  "setari",
  "shop",
  "utilizatori",
]);

export function slugFormatError(slug: string): string | null {
  if (!isValidSlug(slug)) {
    return "Slug invalid. Folosiți litere fără diacritice, cifre și cratime.";
  }
  if (RESERVED_MODEL_SLUGS.has(slug)) {
    return "Acest slug este rezervat unei rute a aplicației.";
  }
  return null;
}

export async function findSlugConflict(
  db: Db,
  slug: string,
  modelId: string | null,
): Promise<string | null> {
  const format = slugFormatError(slug);
  if (format) {
    return format;
  }
  const model = await db.mirrorModel.findFirst({
    where: {
      slug,
      ...(modelId ? { NOT: { id: modelId } } : {}),
    },
    select: { id: true },
  });
  if (model) {
    return "Slug-ul este deja folosit de alt model.";
  }
  const redirect = await db.mirrorModelSlugRedirect.findUnique({
    where: { slug },
    select: { modelId: true },
  });
  if (redirect && redirect.modelId !== modelId) {
    return "Slug-ul este păstrat pentru redirecționarea unui produs publicat.";
  }
  return null;
}

export async function persistSlugChange(
  db: Db,
  input: {
    modelId: string;
    currentSlug: string;
    nextSlug: string;
    isPublished: boolean;
    slugCustomized: boolean;
    name: string;
    slugEdited: boolean;
  },
): Promise<{ ok: true; slug: string; slugCustomized: boolean } | { ok: false; message: string }> {
  let slug = input.nextSlug;
  let customized = input.slugCustomized;

  if (!input.slugEdited && !input.slugCustomized && !input.isPublished) {
    const generated = slugifyModelName(input.name);
    if (!slugFormatError(generated)) {
      slug = generated;
      customized = false;
    } else {
      slug = input.currentSlug;
      customized = false;
    }
  } else if (slug !== input.currentSlug) {
    customized = true;
  }

  if (input.isPublished && !input.slugEdited) {
    slug = input.currentSlug;
    customized = input.slugCustomized;
  }

  const conflict = await findSlugConflict(db, slug, input.modelId);
  if (conflict) {
    return { ok: false, message: conflict };
  }

  if (slug !== input.currentSlug) {
    await db.mirrorModelSlugRedirect.deleteMany({
      where: { modelId: input.modelId, slug },
    });
    if (input.isPublished) {
      await db.mirrorModelSlugRedirect.create({
        data: { modelId: input.modelId, slug: input.currentSlug },
      });
    }
  }

  return { ok: true, slug, slugCustomized: customized };
}
