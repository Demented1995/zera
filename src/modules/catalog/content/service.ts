import { Prisma, type PrismaClient } from "@prisma/client";

import {
  documentFromStored,
  documentToSource,
  isEmptyDocument,
  parseRichSource,
  plainText,
  type RichDocument,
} from "@/modules/catalog/content/document";
import { findSlugConflict, persistSlugChange } from "@/modules/catalog/content/slug-policy";
import { sanitizeExtraSpecs, type DescriptiveSpec } from "@/modules/catalog/content/specs";
import { slugifyModelName } from "@/modules/catalog/slug";

export type ModelContentInput = {
  modelId: string;
  name: string;
  slug: string;
  slugEdited: boolean;
  shortDescription: string;
  descriptionSource: string;
  highlightsSource: string;
  careSource: string;
  warrantySource: string;
  deliverySource: string;
  extraSpecs: unknown;
  seoTitle: string;
  seoDescription: string;
  primaryImageId: string | null;
  primaryAltText: string | null;
};

export type ModelContentSnapshot = {
  name: string;
  slug: string;
  slugCustomized: boolean;
  isPublished: boolean;
  shortDescription: string;
  descriptionSource: string;
  highlightsSource: string;
  careSource: string;
  warrantySource: string;
  deliverySource: string;
  extraSpecs: DescriptiveSpec[];
  seoTitle: string;
  seoDescription: string;
  primaryImageId: string | null;
  primaryAltText: string;
};

function storedDocument(raw: unknown, fallback = ""): RichDocument {
  return documentFromStored(raw, fallback);
}

function sourceOf(raw: unknown, fallback = ""): string {
  return documentToSource(storedDocument(raw, fallback));
}

export function snapshotModelContent(
  model: {
    name: string;
    slug: string;
    slugCustomized: boolean;
    isPublished: boolean;
    shortDescription: string | null;
    fullDescription: string | null;
    descriptionJson: unknown;
    highlightsJson: unknown;
    careJson: unknown;
    warrantyJson: unknown;
    deliveryJson: unknown;
    extraSpecsJson: unknown;
    seoTitle: string | null;
    seoDescription: string | null;
  },
  primary: { id: string; altText: string } | null,
): ModelContentSnapshot {
  return {
    name: model.name,
    slug: model.slug,
    slugCustomized: model.slugCustomized,
    isPublished: model.isPublished,
    shortDescription: model.shortDescription ?? "",
    descriptionSource: sourceOf(model.descriptionJson, model.fullDescription ?? ""),
    highlightsSource: sourceOf(model.highlightsJson),
    careSource: sourceOf(model.careJson),
    warrantySource: sourceOf(model.warrantyJson),
    deliverySource: sourceOf(model.deliveryJson),
    extraSpecs: sanitizeExtraSpecs(model.extraSpecsJson),
    seoTitle: model.seoTitle ?? "",
    seoDescription: model.seoDescription ?? "",
    primaryImageId: primary?.id ?? null,
    primaryAltText: primary?.altText ?? "",
  };
}

function jsonOrNull(document: RichDocument): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return isEmptyDocument(document) ? Prisma.JsonNull : (document as unknown as Prisma.InputJsonValue);
}

export async function saveModelContent(
  db: PrismaClient,
  input: ModelContentInput,
): Promise<{ ok: true; slug: string } | { ok: false; message: string }> {
  const name = input.name.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 200) {
    return { ok: false, message: "Denumirea comercială este obligatorie." };
  }
  const shortDescription = input.shortDescription.replace(/\s+/g, " ").trim().slice(0, 300);
  const seoTitle = input.seoTitle.replace(/\s+/g, " ").trim().slice(0, 200);
  const seoDescription = input.seoDescription.replace(/\s+/g, " ").trim().slice(0, 500);
  const description = parseRichSource(input.descriptionSource);
  const highlights = parseRichSource(input.highlightsSource);
  const care = parseRichSource(input.careSource);
  const warranty = parseRichSource(input.warrantySource);
  const delivery = parseRichSource(input.deliverySource);
  const extraSpecs = sanitizeExtraSpecs(input.extraSpecs);

  const existing = await db.mirrorModel.findUnique({ where: { id: input.modelId } });
  if (!existing) {
    return { ok: false, message: "Modelul nu a fost găsit." };
  }

  const requestedSlug = input.slug.trim() || slugifyModelName(name);
  const formatConflict = await findSlugConflict(db, requestedSlug, existing.id);
  if (input.slugEdited && formatConflict) {
    return { ok: false, message: formatConflict };
  }

  return db.$transaction(async (tx) => {
    const assigned = await persistSlugChange(tx, {
      modelId: existing.id,
      currentSlug: existing.slug,
      nextSlug: requestedSlug,
      isPublished: existing.isPublished,
      slugCustomized: existing.slugCustomized,
      name,
      slugEdited: input.slugEdited,
    });
    if (!assigned.ok) {
      return assigned;
    }

    await tx.mirrorModel.update({
      where: { id: existing.id },
      data: {
        name,
        slug: assigned.slug,
        slugCustomized: assigned.slugCustomized,
        shortDescription: shortDescription || null,
        fullDescription: isEmptyDocument(description) ? null : plainText(description),
        descriptionJson: jsonOrNull(description),
        highlightsJson: jsonOrNull(highlights),
        careJson: jsonOrNull(care),
        warrantyJson: jsonOrNull(warranty),
        deliveryJson: jsonOrNull(delivery),
        extraSpecsJson:
          extraSpecs.length === 0 ? Prisma.JsonNull : (extraSpecs as unknown as Prisma.InputJsonValue),
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
      },
    });

    if (input.primaryImageId && input.primaryAltText !== null) {
      const image = await tx.mirrorModelImage.findFirst({
        where: { id: input.primaryImageId, modelId: existing.id, isPrimary: true },
        select: { id: true },
      });
      if (image) {
        await tx.mirrorModelImage.update({
          where: { id: image.id },
          data: {
            altText: input.primaryAltText.replace(/\s+/g, " ").trim().slice(0, 300),
          },
        });
      }
    }

    return { ok: true as const, slug: assigned.slug };
  });
}
