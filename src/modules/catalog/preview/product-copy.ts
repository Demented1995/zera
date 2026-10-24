import {
  documentFromStored,
  isEmptyDocument,
  plainText,
  sanitizeDocument,
} from "@/modules/catalog/content/document";
import {
  derivePublicSpecifications,
  sanitizeExtraSpecs,
} from "@/modules/catalog/content/specs";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";

import type { PreviewProductCopy } from "@/modules/catalog/preview/types";

function plainOrNull(document: ReturnType<typeof documentFromStored>): string | null {
  if (isEmptyDocument(document)) {
    return null;
  }
  const text = plainText(document).trim();
  return text || null;
}

function cleanSeo(value: string | null | undefined): string | null {
  const text = (value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001F]/g, "")
    .trim()
    .slice(0, 300);
  return text || null;
}

export function composeProductCopy(input: {
  descriptionJson: unknown;
  fullDescription: string | null;
  highlightsJson: unknown;
  careJson: unknown;
  warrantyJson: unknown;
  deliveryJson: unknown;
  extraSpecsJson: unknown;
  seoTitle: string | null;
  seoDescription: string | null;
  slug: string;
  configJson?: unknown;
  rulesJson: unknown;
  state?: ConfiguratorState | null;
}): PreviewProductCopy {
  const description = documentFromStored(input.descriptionJson, input.fullDescription ?? "");
  const highlightsDocument = documentFromStored(input.highlightsJson);
  const careDocument = documentFromStored(input.careJson);
  const warrantyDocument = documentFromStored(input.warrantyJson);
  const deliveryDocument = documentFromStored(input.deliveryJson);
  const derived = derivePublicSpecifications({
    configJson: input.state ? undefined : input.configJson,
    rulesJson: input.rulesJson,
    state: input.state,
  });
  const derivedLabels = new Set(
    derived.map((spec) => spec.label.trim().toLocaleLowerCase("ro")),
  );
  const extraSpecs = sanitizeExtraSpecs(input.extraSpecsJson).filter(
    (spec) => !derivedLabels.has(spec.label.trim().toLocaleLowerCase("ro")),
  );

  return {
    highlights: plainText(highlightsDocument)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    specs: derived.map((spec) => ({
      label: spec.label,
      value: spec.options ? `${spec.value}. ${spec.options}` : spec.value,
    })),
    extraSpecs,
    care: plainOrNull(careDocument),
    warranty: plainOrNull(warrantyDocument),
    delivery: plainOrNull(deliveryDocument),
    description: sanitizeDocument(description),
    highlightsDocument: sanitizeDocument(highlightsDocument),
    careDocument: sanitizeDocument(careDocument),
    warrantyDocument: sanitizeDocument(warrantyDocument),
    deliveryDocument: sanitizeDocument(deliveryDocument),
    seo: {
      title: cleanSeo(input.seoTitle),
      description: cleanSeo(input.seoDescription),
      slug: input.slug,
    },
  };
}
