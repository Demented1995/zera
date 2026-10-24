import { roundMoney } from "@/modules/pricing/engine";

/** Production labor operations — tariffs are admin-configurable; never invented. */
export type LaborOpId =
  | "simple-assembly"
  | "front-led-mount"
  | "back-led-mount"
  | "sensor-install"
  | "transformer-install"
  | "frame-mount"
  | "defog-install"
  | "other";

export type LaborBillingUnit = "piece" | "meter" | "m2" | "hour";

export type PackagingTypeId =
  | "none"
  | "standard"
  | "custom-cardboard"
  | "wood-osb";

/** Product-required packaging enters sinecost; client-extra is a commercial service. */
export type PackagingRole = "included" | "extra";

export type DeliveryTypeId = "pickup" | "chisinau" | "other-moldova";

export type InstallTypeId =
  | "none"
  | "mirror"
  | "mirror-frame"
  | "mirror-accessories"
  | "custom";

export type PriceTier = "wholesale" | "retail";

export const LABOR_OPS: Array<{
  id: LaborOpId;
  label: string;
  billingUnit: LaborBillingUnit;
  note?: string;
}> = [
  {
    id: "simple-assembly",
    label: "Asamblare oglindă simplă",
    billingUnit: "piece",
  },
  {
    id: "front-led-mount",
    label: "Montaj LED față",
    billingUnit: "meter",
    note: "Nu include prețul benzii LED — doar manopera.",
  },
  {
    id: "back-led-mount",
    label: "Montaj LED spate",
    billingUnit: "meter",
    note: "Nu include prețul benzii LED — doar manopera.",
  },
  {
    id: "sensor-install",
    label: "Instalare senzor",
    billingUnit: "piece",
    note: "Nu dublează prețul senzorului din catalog.",
  },
  {
    id: "transformer-install",
    label: "Instalare transformator",
    billingUnit: "piece",
  },
  {
    id: "frame-mount",
    label: "Montaj ramă",
    billingUnit: "meter",
  },
  {
    id: "defog-install",
    label: "Instalare dezaburire",
    billingUnit: "piece",
  },
  {
    id: "other",
    label: "Altă operațiune",
    billingUnit: "hour",
  },
];

export const PACKAGING_TYPES: Array<{
  id: PackagingTypeId;
  label: string;
}> = [
  { id: "none", label: "Fără ambalare extra" },
  { id: "standard", label: "Standard" },
  { id: "custom-cardboard", label: "Carton personalizat" },
  { id: "wood-osb", label: "Lemn / OSB" },
];

export const DELIVERY_TYPES: Array<{ id: DeliveryTypeId; label: string }> = [
  { id: "pickup", label: "Ridicare personală" },
  { id: "chisinau", label: "Livrare Chișinău" },
  { id: "other-moldova", label: "Alte localități MD" },
];

export const INSTALL_TYPES: Array<{ id: InstallTypeId; label: string }> = [
  { id: "none", label: "Fără montaj" },
  { id: "mirror", label: "Montaj oglindă" },
  { id: "mirror-frame", label: "Oglindă + ramă" },
  { id: "mirror-accessories", label: "Oglindă + accesorii" },
  { id: "custom", label: "Personalizat" },
];

export const BILLING_UNIT_LABEL: Record<LaborBillingUnit, string> = {
  piece: "buc",
  meter: "m",
  m2: "m²",
  hour: "oră",
};

export type LaborOpConfig = {
  id: LaborOpId;
  enabled: boolean;
  qty: number;
  /** Admin-configurable tariff; null = unconfigured. */
  tariff: number | null;
  note: string;
};

export type CommercialConfig = {
  laborOps: LaborOpConfig[];

  packagingType: PackagingTypeId;
  packagingRole: PackagingRole;
  /** Admin rule qty (pcs / packs). Auto only when tariff+rule exist. */
  packagingQty: number;
  packagingTariff: number | null;

  deliveryType: DeliveryTypeId;
  deliveryLocality: string;
  /** Distance km — used only when admin rule says so; no invented per-km rate. */
  deliveryDistanceKm: number | null;
  deliveryTariff: number | null;
  deliveryNotes: string;

  installType: InstallTypeId;
  installQty: number;
  installComplexity: string;
  installFloor: number | null;
  installManualCarry: boolean;
  installNotes: string;
  installTariff: number | null;

  /** Wholesale or retail as selected product price for offer total. */
  priceTier: PriceTier;
};

export function defaultCommercialConfig(): CommercialConfig {
  return {
    laborOps: LABOR_OPS.map((op) => ({
      id: op.id,
      enabled: false,
      qty: 0,
      tariff: null,
      note: "",
    })),
    packagingType: "none",
    packagingRole: "included",
    packagingQty: 0,
    packagingTariff: null,
    deliveryType: "pickup",
    deliveryLocality: "",
    deliveryDistanceKm: null,
    deliveryTariff: null,
    deliveryNotes: "",
    installType: "none",
    installQty: 1,
    installComplexity: "",
    installFloor: null,
    installManualCarry: false,
    installNotes: "",
    installTariff: null,
    priceTier: "retail",
  };
}

export type CommercialLaborLine = {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  required: boolean;
  note?: string;
};

export type CommercialServiceLine = {
  key: string;
  label: string;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  group: "packaging-extra" | "delivery" | "install" | "other";
  required: boolean;
  note?: string;
};

/**
 * Build labor (sinecost) and commercial service lines from config.
 * Inactive options (disabled / none / pickup with no fee) do not block calculation.
 * Enabled options without admin tariffs → incomplete blockers.
 */
export function buildCommercialLines(options: {
  commercial: CommercialConfig;
}): {
  laborLines: CommercialLaborLine[];
  /** Included packaging cost contribution (sinecost). */
  packagingIncludedLines: CommercialLaborLine[];
  serviceLines: CommercialServiceLine[];
  blockers: string[];
} {
  const { commercial } = options;
  const laborLines: CommercialLaborLine[] = [];
  const packagingIncludedLines: CommercialLaborLine[] = [];
  const serviceLines: CommercialServiceLine[] = [];
  const blockers: string[] = [];

  for (const op of commercial.laborOps) {
    if (!op.enabled) {
      continue;
    }
    const meta = LABOR_OPS.find((item) => item.id === op.id)!;
    const qty = op.qty;
    laborLines.push({
      key: `labor-${op.id}`,
      label: `Manoperă: ${meta.label}`,
      quantity: qty,
      unit: BILLING_UNIT_LABEL[meta.billingUnit],
      unitPrice: op.tariff,
      required: true,
      note: [meta.note, op.note].filter(Boolean).join(" · ") || undefined,
    });
    if (op.tariff === null || !Number.isFinite(op.tariff)) {
      blockers.push(`Manoperă „${meta.label}”: tarif admin neconfigurat`);
    }
    if (qty <= 0) {
      blockers.push(`Manoperă „${meta.label}”: cantitate invalidă`);
    }
  }

  if (commercial.packagingType !== "none") {
    const packLabel =
      PACKAGING_TYPES.find((item) => item.id === commercial.packagingType)
        ?.label ?? commercial.packagingType;
    const line = {
      key: `packaging-${commercial.packagingType}`,
      label: `Ambalare: ${packLabel}`,
      quantity: commercial.packagingQty,
      unit: "buc",
      unitPrice: commercial.packagingTariff,
      required: true as const,
      note:
        commercial.packagingRole === "included"
          ? "Inclusă în sinecost (regulă admin)."
          : "Ambalare client — serviciu comercial, fără adaos automat pe produs.",
    };

    if (
      commercial.packagingTariff === null ||
      !Number.isFinite(commercial.packagingTariff)
    ) {
      blockers.push(`Ambalare „${packLabel}”: tarif / regulă admin lipsă`);
    }
    if (commercial.packagingQty <= 0) {
      blockers.push(`Ambalare „${packLabel}”: cantitate de confirmat`);
    }

    if (commercial.packagingRole === "included") {
      packagingIncludedLines.push(line);
    } else {
      serviceLines.push({
        ...line,
        group: "packaging-extra",
      });
    }
  }

  if (commercial.deliveryType !== "pickup") {
    const delLabel =
      DELIVERY_TYPES.find((item) => item.id === commercial.deliveryType)
        ?.label ?? commercial.deliveryType;
    const notes: string[] = [
      "Serviciu comercial — separat de prețul oglinzii; fără adaos en-gros/retail automat.",
    ];
    if (commercial.deliveryType === "other-moldova") {
      if (commercial.deliveryLocality.trim()) {
        notes.push(`Localitate: ${commercial.deliveryLocality.trim()}`);
      }
      if (
        commercial.deliveryDistanceKm !== null &&
        commercial.deliveryDistanceKm > 0
      ) {
        notes.push(`Distanță: ${commercial.deliveryDistanceKm} km (fără tarif/km inventat)`);
      }
      if (
        !commercial.deliveryLocality.trim() &&
        (commercial.deliveryDistanceKm === null ||
          commercial.deliveryDistanceKm <= 0)
      ) {
        blockers.push(
          "Livrare alte localități: selectați localitatea sau distanța conform regulii comerciale",
        );
      }
    }
    if (commercial.deliveryNotes.trim()) {
      notes.push(commercial.deliveryNotes.trim());
    }

    serviceLines.push({
      key: `delivery-${commercial.deliveryType}`,
      label: `Livrare: ${delLabel}`,
      quantity: 1,
      unit: "serviciu",
      unitPrice: commercial.deliveryTariff,
      group: "delivery",
      required: true,
      note: notes.join(" · "),
    });
    if (
      commercial.deliveryTariff === null ||
      !Number.isFinite(commercial.deliveryTariff)
    ) {
      blockers.push(`Livrare „${delLabel}”: tarif central admin neconfigurat`);
    }
  }

  if (commercial.installType !== "none") {
    const instLabel =
      INSTALL_TYPES.find((item) => item.id === commercial.installType)
        ?.label ?? commercial.installType;
    const notes: string[] = [
      "Montaj separat de sinecostul de producție.",
    ];
    if (commercial.installComplexity.trim()) {
      notes.push(`Complexitate: ${commercial.installComplexity.trim()}`);
    }
    if (commercial.installFloor !== null) {
      notes.push(`Etaj: ${commercial.installFloor}`);
    }
    if (commercial.installManualCarry) {
      notes.push("Necesită cărat manual");
    }
    if (commercial.installNotes.trim()) {
      notes.push(commercial.installNotes.trim());
    }

    serviceLines.push({
      key: `install-${commercial.installType}`,
      label: `Montaj: ${instLabel}`,
      quantity: commercial.installQty,
      unit: "serviciu",
      unitPrice: commercial.installTariff,
      group: "install",
      required: true,
      note: notes.join(" · "),
    });
    if (
      commercial.installTariff === null ||
      !Number.isFinite(commercial.installTariff)
    ) {
      blockers.push(`Montaj „${instLabel}”: tarif admin neconfigurat`);
    }
    if (commercial.installQty <= 0) {
      blockers.push(`Montaj „${instLabel}”: cantitate invalidă`);
    }
  }

  return { laborLines, packagingIncludedLines, serviceLines, blockers };
}

export function sumPricedLines(
  lines: Array<{ quantity: number; unitPrice: number | null }>,
): number | null {
  if (lines.length === 0) {
    return 0;
  }
  let total = 0;
  for (const line of lines) {
    if (line.unitPrice === null || !Number.isFinite(line.unitPrice)) {
      return null;
    }
    total += line.quantity * line.unitPrice;
  }
  return roundMoney(total);
}
