import type { ConfigStatus, OfferStatus } from "@prisma/client";

import type { CalculationResult } from "@/modules/pricing/engine";

export const CONFIG_STATUS_LABEL: Record<ConfigStatus, string> = {
  DRAFT: "Ciornă",
  COMPLETE: "Completă",
  INCOMPLETE: "Calcul incomplet",
};

export const OFFER_STATUS_LABEL: Record<OfferStatus, string> = {
  DRAFT: "Ciornă",
  ISSUED: "Emisă",
  ACCEPTED: "Acceptată",
  REJECTED: "Respinsă",
  EXPIRED: "Expirată",
};

export function deriveConfigStatus(
  calculation: CalculationResult | null,
  asDraft: boolean,
): ConfigStatus {
  if (asDraft && (!calculation || calculation.status !== "COMPLETE")) {
    // Explicit draft save of incomplete work
    if (!calculation) {
      return "DRAFT";
    }
    return calculation.status === "COMPLETE" ? "COMPLETE" : "INCOMPLETE";
  }
  if (!calculation) {
    return "DRAFT";
  }
  return calculation.status === "COMPLETE" ? "COMPLETE" : "INCOMPLETE";
}

/**
 * Resolve display status: if issued/accepted/rejected past validUntil → EXPIRED
 * without destroying the prior commercial meaning in revisions.
 */
export function resolveOfferDisplayStatus(
  status: OfferStatus,
  validUntil: Date | null | undefined,
  now = new Date(),
): OfferStatus {
  if (
    (status === "ISSUED" || status === "ACCEPTED") &&
    validUntil &&
    validUntil.getTime() < now.getTime()
  ) {
    return "EXPIRED";
  }
  return status;
}
