import type { Role } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { canManageConfiguratorRules } from "@/modules/catalog/permissions";
import {
  resolveConfiguratorRules,
  validateCustomerConfig,
} from "@/modules/catalog/rules";
import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";

import type { PreviewActionResult } from "@/modules/catalog/preview/types";
import {
  assembleMirrorPreview,
  clearInactiveComponents,
  coerceConfiguratorState,
} from "@/modules/catalog/preview/view";

export async function loadMirrorPreview(input: {
  modelId: string;
  request: CustomerConfigRequest;
  role: Role;
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

  const rules = resolveConfiguratorRules(model.configuratorRulesJson);
  const validated = validateCustomerConfig({
    modelDefault,
    rules,
    request: input.request,
  });
  const pricedConfig = clearInactiveComponents(validated.config);
  const { calculation, blockers } = await recalculateFromConfigPayload(
    pricedConfig as unknown as Record<string, unknown>,
  );

  return {
    ok: true,
    ...assembleMirrorPreview({
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
      includeDiagnostic: canManageConfiguratorRules(input.role),
    }),
  };
}
