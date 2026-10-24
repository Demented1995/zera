import type { CustomerConfigRequest } from "@/modules/catalog/rules/types";

import type { PreviewPatch } from "@/modules/catalog/preview/types";

/** Ignore out-of-order quote responses. Only the latest request may update the price. */
export function isLatestPreviewResponse(
  responseId: number,
  latestRequestedId: number,
): boolean {
  return responseId === latestRequestedId;
}

export function applyCustomerPatch(
  selection: CustomerConfigRequest,
  patch: PreviewPatch,
): CustomerConfigRequest {
  const next: CustomerConfigRequest = { ...selection, [patch.field]: patch.value };

  if (patch.field === "frontLedEnabled" && patch.value === false) {
    delete next.frontLedPositioning;
    delete next.frontLedStripTypeId;
    delete next.frontLightTempK;
  }
  if (patch.field === "backLedEnabled" && patch.value === false) {
    delete next.backLedPositioning;
    delete next.backLedStripTypeId;
    delete next.backLightTempK;
  }
  if (
    (patch.field === "frontLedEnabled" || patch.field === "backLedEnabled") &&
    next.frontLedEnabled === false &&
    next.backLedEnabled === false
  ) {
    delete next.switchType;
    delete next.switchQty;
  }
  if (patch.field === "defogEnabled" && patch.value === false) {
    delete next.defogSize;
    delete next.defogControl;
  }
  if (patch.field === "facetEnabled" && patch.value === false) {
    delete next.facetShape;
    delete next.facetWidthMm;
  }
  if (patch.field === "cutouts") {
    next.cutouts = patch.value.filter((line) => line.qty > 0);
  }

  return next;
}
