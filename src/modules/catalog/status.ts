import type { ConfigStatus, MirrorModelStatus } from "@prisma/client";

import type { CalculationResult } from "@/modules/pricing/engine";

export const MODEL_STATUS_LABEL: Record<MirrorModelStatus, string> = {
  DRAFT: "Ciornă",
  ACTIVE: "Activ",
  ARCHIVED: "Arhivat",
};

export const CALC_STATUS_LABEL: Record<ConfigStatus, string> = {
  DRAFT: "Ciornă",
  COMPLETE: "Completă",
  INCOMPLETE: "Calcul incomplet",
};

export function deriveCalcStatus(
  calculation: CalculationResult | null,
): ConfigStatus {
  if (!calculation) {
    return "DRAFT";
  }
  return calculation.status === "COMPLETE" ? "COMPLETE" : "INCOMPLETE";
}

/**
 * Commercial activation requires a complete calculation and a valid tech config.
 * Incomplete work may only be saved as DRAFT (or remain ARCHIVED).
 */
export function assertCanActivate(
  calcStatus: ConfigStatus,
  widthMm: number,
  heightMm: number,
): string | null {
  if (!Number.isFinite(widthMm) || !Number.isFinite(heightMm)) {
    return "Dimensiuni invalide — activarea comercială este blocată.";
  }
  if (widthMm <= 0 || heightMm <= 0) {
    return "Dimensiunile trebuie să fie pozitive pentru activare.";
  }
  if (calcStatus !== "COMPLETE") {
    return "Calcul incomplet — salvați ca ciornă sau completați tarifele lipsă înainte de activare.";
  }
  return null;
}
