import { z } from "zod";

import { CONFIGURATOR_FEATURE_KEYS } from "@/modules/catalog/rules/types";

const featureMode = z.enum(["FIXED", "EDITABLE", "HIDDEN"]);

const featureRuleSchema = z.object({
  mode: featureMode,
  allowedValues: z.array(z.string()).optional().default([]),
});

const dimensionRuleSchema = z.object({
  mode: featureMode,
  minMm: z.number().positive().nullable().optional(),
  maxMm: z.number().positive().nullable().optional(),
  stepMm: z.number().positive().nullable().optional(),
});

const compatibilitySchema = z.object({
  id: z.string().min(1),
  kind: z.enum([
    "requires_lighting",
    "requires_front_led",
    "requires_back_led",
    "requires_defog",
    "forbidden_frame_shape",
  ]),
  frameTypeId: z.string().optional(),
  forbiddenShapeIds: z.array(z.string()).optional(),
});

export const configuratorRulesSchema = z.object({
  version: z.literal(1),
  dimensions: z.object({
    width: dimensionRuleSchema,
    height: dimensionRuleSchema,
  }),
  features: z
    .record(z.string(), featureRuleSchema)
    .refine(
      (value) => CONFIGURATOR_FEATURE_KEYS.every((key) => key in value),
      "Lipsesc reguli pentru unele caracteristici.",
    ),
  compatibility: z.array(compatibilitySchema).default([]),
});

export const saveConfiguratorRulesSchema = z.object({
  modelId: z.string().cuid(),
  rules: configuratorRulesSchema,
});

export const customerConfigRequestSchema = z
  .object({
    shapeId: z.string().optional(),
    widthMm: z.number().optional(),
    heightMm: z.number().optional(),
    glassTypeId: z.string().optional(),
    frontLedEnabled: z.boolean().optional(),
    backLedEnabled: z.boolean().optional(),
    frontLedPositioning: z.string().optional(),
    backLedPositioning: z.string().optional(),
    frontLedStripTypeId: z.string().optional(),
    backLedStripTypeId: z.string().optional(),
    frontLightTempK: z.number().optional(),
    backLightTempK: z.number().optional(),
    switchType: z.string().optional(),
    switchQty: z.number().int().positive().optional(),
    defogEnabled: z.boolean().optional(),
    defogSize: z.string().optional(),
    defogControl: z.string().optional(),
    frameType: z.string().optional(),
    facetEnabled: z.boolean().optional(),
    facetShape: z.string().optional(),
    facetWidthMm: z.number().optional(),
    sandblastFinish: z.string().optional(),
    engravingEnabled: z.boolean().optional(),
    cutouts: z
      .array(z.object({ type: z.string(), qty: z.number().int().positive() }))
      .optional(),
    accessoryIds: z.array(z.string()).optional(),
    logoIds: z.array(z.string()).optional(),
    antiShatterFilmEnabled: z.boolean().optional(),
  })
  .strict();

export const quoteCustomerConfigSchema = z.object({
  modelId: z.string().cuid(),
  request: customerConfigRequestSchema,
});
