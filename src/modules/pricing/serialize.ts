import type { PricingSettings, PricingSettingsHistory, User } from "@prisma/client";

export type PricingSettingsDTO = {
  wholesaleMarkupPercent: string;
  retailMarkupPercent: string;
  curvedEdgeAddMm: string;
  sandblastMinCharge: string;
  updatedAt: string;
};

export type PricingHistoryDTO = {
  id: string;
  fieldKey: string;
  fieldLabel: string;
  previousValue: string | null;
  newValue: string | null;
  changedAt: string;
  changedByName: string;
  changedByEmail: string;
};

const FIELD_LABELS: Record<string, string> = {
  wholesaleMarkupPercent: "Adaos en-gros (%)",
  retailMarkupPercent: "Adaos retail (%)",
  curvedEdgeAddMm: "Adaos latură curbă (mm)",
  sandblastMinCharge: "Minim sablare (MDL)",
};

export function serializePricingSettings(
  settings: PricingSettings,
): PricingSettingsDTO {
  return {
    wholesaleMarkupPercent: settings.wholesaleMarkupPercent.toString(),
    retailMarkupPercent: settings.retailMarkupPercent.toString(),
    curvedEdgeAddMm: settings.curvedEdgeAddMm.toString(),
    sandblastMinCharge: settings.sandblastMinCharge.toString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export function serializePricingHistory(
  entry: PricingSettingsHistory & {
    changedBy: Pick<User, "name" | "email">;
  },
): PricingHistoryDTO {
  return {
    id: entry.id,
    fieldKey: entry.fieldKey,
    fieldLabel: FIELD_LABELS[entry.fieldKey] ?? entry.fieldKey,
    previousValue: entry.previousValue,
    newValue: entry.newValue,
    changedAt: entry.changedAt.toISOString(),
    changedByName: entry.changedBy.name?.trim() || entry.changedBy.email,
    changedByEmail: entry.changedBy.email,
  };
}
