import { z } from "zod";

import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import {
  ELECTRICAL_CONNECTIONS,
  EXTRA_COMPONENTS,
  LED_POSITIONINGS,
  LED_STRIP_TYPES,
  LED_TEMPERATURES,
  LIGHTING_TYPES,
  SWITCH_TYPES,
} from "@/modules/configurator/lighting";
import { CONFIGURATOR_SHAPES } from "@/modules/configurator/shapes";

const shapeIds = CONFIGURATOR_SHAPES.map((shape) => shape.id) as [
  string,
  ...string[],
];
const glassIds = CONFIGURATOR_GLASS_TYPES.map((type) => type.id) as [
  string,
  ...string[],
];
const lightingTypeIds = LIGHTING_TYPES.map((item) => item.id) as [
  "none",
  ...Array<"none" | "front" | "back" | "both">,
];
const positioningIds = LED_POSITIONINGS.map((item) => item.id) as [
  "one_width",
  ...Array<
    "one_width" | "two_width" | "one_height" | "two_height" | "perimeter"
  >,
];
const stripTypeIds = LED_STRIP_TYPES.map((item) => item.id) as [
  "standard-15w",
  ...Array<"standard-15w" | "cob-10w">,
];
const temperatureIds = LED_TEMPERATURES.map((item) => item.id) as [
  3000,
  ...Array<3000 | 4000 | 6000>,
];
const switchTypeIds = SWITCH_TYPES.map((item) => item.id) as [
  "mechanical",
  ...Array<"mechanical" | "touch" | "motion">,
];
const connectionIds = ELECTRICAL_CONNECTIONS.map((item) => item.id) as [
  "direct-cable",
  ...Array<"direct-cable" | "plug">,
];
const extraIds = EXTRA_COMPONENTS.map((item) => item.id) as [
  "mounting-profile",
  ...Array<(typeof EXTRA_COMPONENTS)[number]["id"]>,
];

const nonNeg = z.coerce.number().finite().min(0, "Valoarea trebuie să fie ≥ 0");

const ledSystemSchema = z.object({
  positioning: z.enum(positioningIds),
  stripTypeId: z.enum(stripTypeIds),
  temperatureK: z.coerce
    .number()
    .refine(
      (value): value is 3000 | 4000 | 6000 =>
        (temperatureIds as number[]).includes(value),
      "Temperatură invalidă",
    ),
  manualBaseLengthMm: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : value,
    z.coerce.number().finite().positive().nullable(),
  ),
  useManualOverride: z.coerce.boolean().default(false),
  manualOverrideReason: z.string().max(500).default(""),
});

const switchSchema = z.object({
  type: z.enum(switchTypeIds),
  qty: z.coerce.number().finite().int().min(0),
  associatedSystem: z.enum(["front", "back", "shared"]),
});

const extraSchema = z.object({
  id: z.enum(extraIds),
  enabled: z.coerce.boolean(),
  qty: z.coerce.number().finite().min(0),
  side: z.enum(["front", "back", "shared"]),
});

export const configuratorInputSchema = z
  .object({
    shapeId: z.enum(shapeIds),
    widthMm: z.coerce
      .number()
      .finite("Lățime invalidă")
      .positive("Lățimea trebuie să fie pozitivă"),
    heightMm: z.coerce
      .number()
      .finite("Înălțime invalidă")
      .positive("Înălțimea trebuie să fie pozitivă"),
    glassTypeId: z.enum(glassIds),
    edgeLeftMm: nonNeg.default(0),
    edgeRightMm: nonNeg.default(0),
    edgeTopMm: nonNeg.default(0),
    edgeBottomMm: nonNeg.default(0),
    lightingType: z.enum(lightingTypeIds).default("none"),
    frontLed: ledSystemSchema.optional(),
    backLed: ledSystemSchema.optional(),
    switches: z.array(switchSchema).default([]),
    transformerPcs: z.coerce.number().finite().int().min(0).default(0),
    electricalConnection: z.enum(connectionIds).default("direct-cable"),
    extraComponents: z.array(extraSchema).default([]),
  })
  .superRefine((value, ctx) => {
    const checkOverride = (
      system: z.infer<typeof ledSystemSchema> | undefined,
      path: string,
    ) => {
      if (!system?.useManualOverride) {
        return;
      }
      if (!system.manualOverrideReason.trim()) {
        ctx.addIssue({
          code: "custom",
          path: [path, "manualOverrideReason"],
          message: "Motivul este obligatoriu pentru override-ul lungimii LED.",
        });
      }
      if (
        system.manualBaseLengthMm === null ||
        system.manualBaseLengthMm === undefined
      ) {
        ctx.addIssue({
          code: "custom",
          path: [path, "manualBaseLengthMm"],
          message: "Lungimea de bază (mm) este obligatorie la override.",
        });
      }
    };
    if (value.lightingType === "front" || value.lightingType === "both") {
      checkOverride(value.frontLed, "frontLed");
    }
    if (value.lightingType === "back" || value.lightingType === "both") {
      checkOverride(value.backLed, "backLed");
    }
  });

export type ConfiguratorInputValues = z.infer<typeof configuratorInputSchema>;
