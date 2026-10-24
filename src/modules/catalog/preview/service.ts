import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { canManageConfiguratorRules } from "@/modules/catalog/permissions";
import {
  resolveConfiguratorRules,
  validateCustomerConfig,
} from "@/modules/catalog/rules";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import { applyRetailSupplements } from "@/modules/catalog/preview/supplements";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import {
  getPricingSettings,
  loadCatalogMaterialsForEngine,
  toPricingRules,
} from "@/modules/pricing/queries";

import { mediaPath } from "@/modules/catalog/images/service";
import { composeProductCopy } from "@/modules/catalog/preview/product-copy";
import type {
  CustomerPreviewPayload,
  PreviewActionResult,
  PreviewGalleryImage,
} from "@/modules/catalog/preview/types";
import {
  assembleMirrorPreview,
  clearInactiveComponents,
  coerceConfiguratorState,
} from "@/modules/catalog/preview/view";

export async function loadMirrorPreview(input: {
  modelId: string;
  request: CustomerConfigRequest;
  role?: Role;
  includeDiagnostic?: boolean;
}): Promise<PreviewActionResult> {
  const model = await prisma.mirrorModel.findUnique({
    where: { id: input.modelId },
  });
  if (!model) {
    return { ok: false, message: "Modelul nu a fost găsit." };
  }

  const modelDefault = coerceConfiguratorState(model.configJson);
  if (!modelDefault) {
    return { ok: false, message: "Configurația tehnică a modelului este incompletă." };
  }

  const [rules, photos] = [
    resolveConfiguratorRules(model.configuratorRulesJson),
    await prisma.mirrorModelImage.findMany({
      where: { modelId: model.id },
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
      select: { id: true, altText: true, isPrimary: true },
    }),
  ] as const;
  const validated = validateCustomerConfig({
    modelDefault,
    rules,
    request: input.request,
  });
  const pricedConfig = clearInactiveComponents(validated.config);
  const { calculation, blockers } = await recalculateFromConfigPayload(
    pricedConfig as unknown as Record<string, unknown>,
  );

  const assembled = assembleMirrorPreview({
      model: {
        id: model.id,
        name: model.name,
        code: model.code,
        shortDescription: model.shortDescription,
        fullDescription: model.fullDescription,
        status: model.status,
      },
      rules,
      modelDefault,
      validated: { ...validated, config: pricedConfig },
      priceSource: calculation
        ? {
            status: calculation.status,
            retailPrice: calculation.retailPrice,
            missingCosts: calculation.missingCosts,
          }
        : null,
      blockers,
      includeDiagnostic:
        input.includeDiagnostic ??
        (input.role ? canManageConfiguratorRules(input.role) : false),
      gallery: galleryFrom(model.id, photos),
      productCopy: composeProductCopy({
        descriptionJson: model.descriptionJson,
        fullDescription: model.fullDescription,
        highlightsJson: model.highlightsJson,
        careJson: model.careJson,
        warrantyJson: model.warrantyJson,
        deliveryJson: model.deliveryJson,
        extraSpecsJson: model.extraSpecsJson,
        seoTitle: model.seoTitle,
        seoDescription: model.seoDescription,
        slug: model.slug,
        configJson: model.configJson,
        rulesJson: model.configuratorRulesJson,
        state: pricedConfig,
      }),
  });

  const hasChoices = assembled.customer.controls.some(
    (control) => control.kind === "select",
  );
  if (!hasChoices) {
    return { ok: true, ...assembled };
  }

  const [settings, materials] = await Promise.all([
    getPricingSettings(),
    loadCatalogMaterialsForEngine(),
  ]);
  return {
    ok: true,
    customer: {
      ...assembled.customer,
      controls: applyRetailSupplements({
        controls: assembled.customer.controls,
        selection: assembled.customer.selection,
        modelDefault,
        rules,
        materials,
        pricingRules: toPricingRules(settings),
      }),
    },
    diagnostic: assembled.diagnostic,
  };
}

function galleryFrom(
  modelId: string,
  photos: Array<{ id: string; altText: string; isPrimary: boolean }>,
): PreviewGalleryImage[] {
  return photos.map((photo) => ({
    id: photo.id,
    alt: photo.altText,
    src: mediaPath(modelId, photo.id, "display"),
    thumbSrc: mediaPath(modelId, photo.id, "thumb"),
    isPrimary: photo.isPrimary,
  }));
}

export async function loadProductPage(input: {
  modelId: string;
  request: CustomerConfigRequest;
  role: Role;
}): Promise<
  | { found: false }
  | {
      found: true;
      customer: CustomerPreviewPayload;
      published: boolean;
    }
> {
  const preview = await loadMirrorPreview(input);
  if (preview.ok) {
    const published = await prisma.mirrorModel.findUnique({
      where: { id: input.modelId },
      select: { isPublished: true },
    });
    return {
      found: true,
      customer: preview.customer,
      published: published?.isPublished ?? false,
    };
  }

  if (preview.message === "Modelul nu a fost găsit.") {
    return { found: false };
  }

  const model = await prisma.mirrorModel.findUnique({
    where: { id: input.modelId },
  });
  if (!model) {
    return { found: false };
  }

  const photos = await prisma.mirrorModelImage.findMany({
    where: { modelId: model.id },
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    select: { id: true, altText: true, isPrimary: true },
  });
  const customer: CustomerPreviewPayload = {
    model: {
      id: model.id,
      name: model.name,
      code: model.code,
      shortDescription: model.shortDescription,
      fullDescription: model.fullDescription,
      status: model.status,
    },
    gallery: galleryFrom(model.id, photos),
    productCopy: composeProductCopy({
      descriptionJson: model.descriptionJson,
      fullDescription: model.fullDescription,
      highlightsJson: model.highlightsJson,
      careJson: model.careJson,
      warrantyJson: model.warrantyJson,
      deliveryJson: model.deliveryJson,
      extraSpecsJson: model.extraSpecsJson,
      seoTitle: model.seoTitle,
      seoDescription: model.seoDescription,
      slug: model.slug,
      configJson: model.configJson,
      rulesJson: model.configuratorRulesJson,
    }),
    sections: [],
    controls: [],
    selection: {},
    price: {
      available: false,
      retailPrice: null,
      currency: "MDL",
      message: "Preț indisponibil momentan",
    },
    notices: [preview.message],
  };

  return { found: true, customer, published: model.isPublished };
}
