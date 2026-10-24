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
import {
  DELIVERY_TYPES,
  INSTALL_TYPES,
  LABOR_OPS,
  PACKAGING_TYPES,
} from "@/modules/configurator/commercial";
import {
  BRANDING_OPTIONS,
  CUTOUT_TYPES,
  DEFOG_CONTROLS,
  DEFOG_SIZES,
  FACET_SHAPES,
  FACET_WIDTHS,
  FRAME_TYPES,
  MOUNTING_TYPES,
  PRODUCT_ACCESSORIES,
  SANDBLAST_FINISHES,
} from "@/modules/configurator/processing";
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

const sandblastFinishIds = SANDBLAST_FINISHES.map((item) => item.id) as [
  "none",
  ...Array<"none" | "standard" | "painted" | "laser">,
];
const facetShapeIds = FACET_SHAPES.map((item) => item.id) as [
  "straight",
  ...Array<"straight" | "curved">,
];
const facetWidthIds = FACET_WIDTHS as [10, ...Array<10 | 15 | 20>];
const defogSizeIds = DEFOG_SIZES.map((item) => item.id) as [
  "300x400",
  ...Array<"300x400" | "400x500">,
];
const defogControlIds = DEFOG_CONTROLS.map((item) => item.id) as [
  "mechanical",
  ...Array<"mechanical" | "touch">,
];
const frameTypeIds = FRAME_TYPES.map((item) => item.id) as [
  "none",
  ...Array<(typeof FRAME_TYPES)[number]["id"]>,
];
const mountingTypeIds = MOUNTING_TYPES.map((item) => item.id) as [
  "standard",
  ...Array<"standard" | "with-frame">,
];
const cutoutTypeIds = CUTOUT_TYPES.map((item) => item.id) as [
  "hole-le-50",
  ...Array<(typeof CUTOUT_TYPES)[number]["id"]>,
];
const productAccessoryIds = PRODUCT_ACCESSORIES.map((item) => item.id) as [
  "clock",
  ...Array<(typeof PRODUCT_ACCESSORIES)[number]["id"]>,
];
const brandingIds = BRANDING_OPTIONS.map((item) => item.id) as [
  "logo-lit",
  ...Array<(typeof BRANDING_OPTIONS)[number]["id"]>,
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

const nullableNonNeg = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.coerce.number().finite().min(0).nullable(),
);

const processingSchema = z.object({
  sandblastFinish: z.enum(sandblastFinishIds).default("none"),
  sandblastAreaMode: z.enum(["direct", "bands"]).default("direct"),
  sandblastAreaM2: nonNeg.default(0),
  sandblastBands: z
    .array(
      z.object({
        count: z.coerce.number().finite().int().min(0),
        lengthMm: nonNeg,
        widthMm: nonNeg,
      }),
    )
    .default([]),
  facetEnabled: z.coerce.boolean().default(false),
  facetShape: z.enum(facetShapeIds).default("straight"),
  facetWidthMm: z.coerce
    .number()
    .refine(
      (value): value is 10 | 15 | 20 =>
        (facetWidthIds as number[]).includes(value),
      "Lățime fațetă invalidă",
    )
    .default(10),
  facetLengthM: nonNeg.default(0),
  engravingEnabled: z.coerce.boolean().default(false),
  engravingDescription: z.string().max(500).default(""),
  engravingQty: z.coerce.number().finite().int().min(0).default(1),
  engravingUnitCost: nullableNonNeg,
  defogEnabled: z.coerce.boolean().default(false),
  defogSize: z.enum(defogSizeIds).default("300x400"),
  defogControl: z.enum(defogControlIds).default("mechanical"),
  defogQty: z.coerce.number().finite().int().min(0).default(1),
  frameType: z.enum(frameTypeIds).default("none"),
  frameConsumptionQty: nonNeg.default(0),
  mountingType: z.enum(mountingTypeIds).default("standard"),
  mountingComponents: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        qty: nonNeg,
        materialSeedKey: z.string().nullable(),
      }),
    )
    .default([]),
  cutouts: z
    .array(
      z.object({
        type: z.enum(cutoutTypeIds),
        qty: z.coerce.number().finite().int().min(0),
        diameterMm: nullableNonNeg,
        widthMm: nullableNonNeg,
        heightMm: nullableNonNeg,
      }),
    )
    .default([]),
  accessories: z
    .array(
      z.object({
        id: z.enum(productAccessoryIds),
        enabled: z.coerce.boolean(),
        qty: z.coerce.number().finite().min(0),
        note: z.string().max(300).default(""),
      }),
    )
    .default([]),
  branding: z
    .array(
      z.object({
        id: z.enum(brandingIds),
        enabled: z.coerce.boolean(),
        qty: z.coerce.number().finite().min(0),
      }),
    )
    .default([]),
});

const laborOpIds = LABOR_OPS.map((item) => item.id) as [
  "simple-assembly",
  ...Array<(typeof LABOR_OPS)[number]["id"]>,
];
const packagingTypeIds = PACKAGING_TYPES.map((item) => item.id) as [
  "none",
  ...Array<(typeof PACKAGING_TYPES)[number]["id"]>,
];
const deliveryTypeIds = DELIVERY_TYPES.map((item) => item.id) as [
  "pickup",
  ...Array<(typeof DELIVERY_TYPES)[number]["id"]>,
];
const installTypeIds = INSTALL_TYPES.map((item) => item.id) as [
  "none",
  ...Array<(typeof INSTALL_TYPES)[number]["id"]>,
];

const commercialSchema = z.object({
  laborOps: z
    .array(
      z.object({
        id: z.enum(laborOpIds),
        enabled: z.coerce.boolean(),
        qty: nonNeg,
        tariff: nullableNonNeg,
        note: z.string().max(300).default(""),
      }),
    )
    .default([]),
  packagingType: z.enum(packagingTypeIds).default("none"),
  packagingRole: z.enum(["included", "extra"]).default("included"),
  packagingQty: nonNeg.default(0),
  packagingTariff: nullableNonNeg,
  deliveryType: z.enum(deliveryTypeIds).default("pickup"),
  deliveryLocality: z.string().max(200).default(""),
  deliveryDistanceKm: nullableNonNeg,
  deliveryTariff: nullableNonNeg,
  deliveryNotes: z.string().max(500).default(""),
  installType: z.enum(installTypeIds).default("none"),
  installQty: z.coerce.number().finite().int().min(0).default(1),
  installComplexity: z.string().max(200).default(""),
  installFloor: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? null : value,
    z.coerce.number().finite().int().nullable(),
  ),
  installManualCarry: z.coerce.boolean().default(false),
  installNotes: z.string().max(500).default(""),
  installTariff: nullableNonNeg,
  priceTier: z.enum(["wholesale", "retail"]).default("retail"),
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
    processing: processingSchema.optional(),
    commercial: commercialSchema.optional(),
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
