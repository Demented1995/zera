import { z } from "zod";

import { MATERIAL_CURRENCY } from "@/modules/materials/constants";

const optionalTrimmed = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

/** Accept empty string / missing as null; never coerce to 0. */
const nullablePrice = z.preprocess((value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return null;
    }
    return trimmed;
  }
  return value;
}, z.union([
  z.null(),
  z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, "Preț invalid (max. 2 zecimale)")
    .refine((value) => Number(value) >= 0, "Prețul nu poate fi negativ"),
]));

export const materialFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Numele este obligatoriu")
    .max(200, "Numele este prea lung"),
  internalCode: optionalTrimmed.pipe(
    z.string().max(64, "Codul intern este prea lung").optional(),
  ),
  categoryId: z.string().min(1, "Categoria este obligatorie"),
  unitPrice: nullablePrice,
  unitOfMeasure: z
    .string()
    .trim()
    .min(1, "Unitatea de măsură este obligatorie")
    .max(64, "Unitatea de măsură este prea lungă"),
  currency: z.literal(MATERIAL_CURRENCY).default(MATERIAL_CURRENCY),
  description: optionalTrimmed.pipe(
    z.string().max(2000, "Descrierea este prea lungă").optional(),
  ),
  isActive: z.boolean().default(true),
});

export const materialUpdateSchema = materialFormSchema.extend({
  id: z.string().min(1),
});

export const categoryFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Numele categoriei este obligatoriu")
    .max(120, "Numele categoriei este prea lung"),
});

export const categoryUpdateSchema = categoryFormSchema.extend({
  id: z.string().min(1),
});

export type MaterialFormValues = z.infer<typeof materialFormSchema>;
export type MaterialUpdateValues = z.infer<typeof materialUpdateSchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;
