import { z } from "zod";

import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import { CONFIGURATOR_SHAPES } from "@/modules/configurator/shapes";

const shapeIds = CONFIGURATOR_SHAPES.map((shape) => shape.id) as [
  string,
  ...string[],
];
const glassIds = CONFIGURATOR_GLASS_TYPES.map((type) => type.id) as [
  string,
  ...string[],
];

const nonNeg = z.coerce.number().finite().min(0, "Valoarea trebuie să fie ≥ 0");

export const configuratorInputSchema = z.object({
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
});

export type ConfiguratorInputValues = z.infer<typeof configuratorInputSchema>;
