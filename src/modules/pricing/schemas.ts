import { z } from "zod";

const nonNegNumber = z.coerce.number().finite().min(0);

export const pricingSettingsSchema = z.object({
  wholesaleMarkupPercent: nonNegNumber,
  retailMarkupPercent: nonNegNumber,
  curvedEdgeAddMm: nonNegNumber,
  sandblastMinCharge: nonNegNumber,
});

export const calculatorInputSchema = z.object({
  widthMm: z.coerce.number().finite().positive("Lățimea trebuie să fie pozitivă"),
  heightMm: z.coerce.number().finite().positive("Înălțimea trebuie să fie pozitivă"),
  shape: z.enum(["RECTANGLE", "SPECIAL"]),
  curvedLeft: z.boolean().default(false),
  curvedRight: z.boolean().default(false),
  curvedTop: z.boolean().default(false),
  curvedBottom: z.boolean().default(false),
  ledMeters: nonNegNumber.default(0),
  transformerPcs: nonNegNumber.default(0),
  touchPcs: nonNegNumber.default(0),
  decorativeSandblastAreaM2: nonNegNumber.default(0),
  laborCost: z
    .union([z.literal(""), z.null(), z.coerce.number().finite().min(0)])
    .optional()
    .transform((value) => {
      if (value === "" || value === undefined) {
        return null;
      }
      return value;
    }),
  serviceCosts: z
    .union([z.literal(""), z.null(), z.coerce.number().finite().min(0)])
    .optional()
    .transform((value) => {
      if (value === "" || value === undefined) {
        return null;
      }
      return value;
    }),
});

export type PricingSettingsValues = z.infer<typeof pricingSettingsSchema>;
export type CalculatorInputValues = z.infer<typeof calculatorInputSchema>;
