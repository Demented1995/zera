"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { calculateMirrorPricing } from "@/modules/pricing/engine";
import type { CalculationResult } from "@/modules/pricing/engine";
import { canEditPricingRules } from "@/modules/pricing/permissions";
import {
  loadCatalogMaterialsForEngine,
  getPricingSettings,
  toPricingRules,
} from "@/modules/pricing/queries";
import {
  calculatorInputSchema,
  pricingSettingsSchema,
} from "@/modules/pricing/schemas";

export type ActionResult<T = undefined> =
  | { ok: true; message: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

const SETTINGS_FIELDS = [
  "wholesaleMarkupPercent",
  "retailMarkupPercent",
  "curvedEdgeAddMm",
  "sandblastMinCharge",
] as const;

type SettingsField = (typeof SETTINGS_FIELDS)[number];

function decimalString(value: Prisma.Decimal | number): string {
  return value instanceof Prisma.Decimal ? value.toString() : String(value);
}

export async function updatePricingSettingsAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canEditPricingRules(session.user.role)) {
    return {
      ok: false,
      message: "Doar administratorii pot modifica regulile globale de preț.",
    };
  }

  const parsed = pricingSettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați valorile introduse.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const current = await getPricingSettings();
  const next = parsed.data;

  const changes: Array<{
    fieldKey: SettingsField;
    previousValue: string;
    newValue: string;
  }> = [];

  for (const field of SETTINGS_FIELDS) {
    const previousValue = decimalString(current[field]);
    const newValue = String(next[field]);
    if (previousValue !== newValue) {
      changes.push({ fieldKey: field, previousValue, newValue });
    }
  }

  if (changes.length === 0) {
    return { ok: true, message: "Nicio modificare de salvat." };
  }

  await prisma.$transaction(async (tx) => {
    await tx.pricingSettings.update({
      where: { id: "default" },
      data: {
        wholesaleMarkupPercent: new Prisma.Decimal(next.wholesaleMarkupPercent),
        retailMarkupPercent: new Prisma.Decimal(next.retailMarkupPercent),
        curvedEdgeAddMm: new Prisma.Decimal(next.curvedEdgeAddMm),
        sandblastMinCharge: new Prisma.Decimal(next.sandblastMinCharge),
      },
    });

    await tx.pricingSettingsHistory.createMany({
      data: changes.map((change) => ({
        fieldKey: change.fieldKey,
        previousValue: change.previousValue,
        newValue: change.newValue,
        changedById: session.user.id,
      })),
    });
  });

  revalidatePath("/admin/preturi");
  return { ok: true, message: "Regulile de preț au fost actualizate." };
}

export async function runPricingCalculatorAction(
  raw: unknown,
): Promise<ActionResult<CalculationResult>> {
  await requireStaffSession();

  const parsed = calculatorInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele de calcul.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const values = parsed.data;
  const [settings, materials] = await Promise.all([
    getPricingSettings(),
    loadCatalogMaterialsForEngine(),
  ]);

  const result = calculateMirrorPricing({
    widthMm: values.widthMm,
    heightMm: values.heightMm,
    shape: values.shape,
    curvedEdges: {
      left: values.curvedLeft,
      right: values.curvedRight,
      top: values.curvedTop,
      bottom: values.curvedBottom,
    },
    components: {
      ledMeters: values.ledMeters,
      transformerPcs: values.transformerPcs,
      touchPcs: values.touchPcs,
    },
    decorativeSandblastAreaM2: values.decorativeSandblastAreaM2,
    laborCost: values.laborCost,
    serviceCosts: values.serviceCosts,
    materials,
    rules: toPricingRules(settings),
  });

  return {
    ok: true,
    message:
      result.status === "COMPLETE"
        ? "Calcul complet."
        : "Calcul incomplet — lipsesc costuri.",
    data: result,
  };
}
