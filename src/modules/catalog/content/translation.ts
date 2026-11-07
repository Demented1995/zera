import { Prisma } from "@prisma/client";

import { sanitizeExtraSpecs, type DescriptiveSpec } from "@/modules/catalog/content/specs";

export type ProductTranslation = {
  name: string;
  shortDescription: string;
  descriptionSource: string;
  highlightsSource: string;
  careSource: string;
  warrantySource: string;
  deliverySource: string;
  extraSpecs: DescriptiveSpec[];
  seoTitle: string;
  seoDescription: string;
  primaryAltText: string;
};

export function emptyProductTranslation(): ProductTranslation {
  return {
    name: "",
    shortDescription: "",
    descriptionSource: "",
    highlightsSource: "",
    careSource: "",
    warrantySource: "",
    deliverySource: "",
    extraSpecs: [],
    seoTitle: "",
    seoDescription: "",
    primaryAltText: "",
  };
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.replace(/<[^>]*>/g, "").trim().slice(0, max) : "";
}

export function readProductTranslation(raw: unknown): ProductTranslation {
  const empty = emptyProductTranslation();
  if (!raw || typeof raw !== "object" || !("ru" in raw)) {
    return empty;
  }
  const ru = (raw as { ru?: unknown }).ru;
  if (!ru || typeof ru !== "object") {
    return empty;
  }
  const row = ru as Record<string, unknown>;
  return {
    name: text(row.name, 200),
    shortDescription: text(row.shortDescription, 300),
    descriptionSource: text(row.descriptionSource, 20_000),
    highlightsSource: text(row.highlightsSource, 20_000),
    careSource: text(row.careSource, 20_000),
    warrantySource: text(row.warrantySource, 20_000),
    deliverySource: text(row.deliverySource, 20_000),
    extraSpecs: sanitizeExtraSpecs(row.extraSpecs),
    seoTitle: text(row.seoTitle, 200),
    seoDescription: text(row.seoDescription, 500),
    primaryAltText: text(row.primaryAltText, 300),
  };
}

export function productTranslationJson(
  value: ProductTranslation,
): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const cleaned = readProductTranslation({ ru: value });
  const hasText = [
    cleaned.name,
    cleaned.shortDescription,
    cleaned.descriptionSource,
    cleaned.highlightsSource,
    cleaned.careSource,
    cleaned.warrantySource,
    cleaned.deliverySource,
    cleaned.seoTitle,
    cleaned.seoDescription,
    cleaned.primaryAltText,
    ...cleaned.extraSpecs.flatMap((spec) => [spec.label, spec.value]),
  ].some((item) => item.trim());
  if (!hasText) {
    return Prisma.JsonNull;
  }
  return { ru: cleaned } as unknown as Prisma.InputJsonValue;
}
