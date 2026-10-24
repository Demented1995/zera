import { CONFIGURATOR_GLASS_TYPES } from "@/modules/configurator/glass-types";
import {
  LED_POSITIONINGS,
  LED_STRIP_TYPES,
  LED_TEMPERATURES,
  SWITCH_TYPES,
} from "@/modules/configurator/lighting";
import {
  BRANDING_OPTIONS,
  CUTOUT_TYPES,
  DEFOG_CONTROLS,
  DEFOG_SIZES,
  FACET_SHAPES,
  FACET_WIDTHS,
  FRAME_TYPES,
  PRODUCT_ACCESSORIES,
  SANDBLAST_FINISHES,
} from "@/modules/configurator/processing";
import { CONFIGURATOR_SHAPES } from "@/modules/configurator/shapes";
import type { ConfiguratorFeatureKey } from "@/modules/catalog/rules/types";

export type OptionChoice = { id: string; label: string };

/** Catalog of selectable values for EDITABLE features — reuse existing tech IDs. */
export function optionCatalogForFeature(
  feature: ConfiguratorFeatureKey,
): OptionChoice[] {
  switch (feature) {
    case "shape":
      return CONFIGURATOR_SHAPES.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "glassType":
      return CONFIGURATOR_GLASS_TYPES.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "ledPosition":
      return LED_POSITIONINGS.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "ledStripType":
      return LED_STRIP_TYPES.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "lightTemp":
      return LED_TEMPERATURES.map((item) => ({
        id: String(item.id),
        label: item.label,
      }));
    case "switchType":
      return SWITCH_TYPES.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "defog":
      return [
        ...DEFOG_SIZES.map((item) => ({
          id: `size:${item.id}`,
          label: `Dimensiune ${item.label}`,
        })),
        ...DEFOG_CONTROLS.map((item) => ({
          id: `control:${item.id}`,
          label: `Control ${item.label}`,
        })),
        { id: "enabled", label: "Permite activare dezaburire" },
      ];
    case "frames":
      return FRAME_TYPES.map((item) => ({ id: item.id, label: item.label }));
    case "facets":
      return [
        { id: "enabled", label: "Permite fațetă" },
        ...FACET_SHAPES.map((item) => ({
          id: `shape:${item.id}`,
          label: item.label,
        })),
        ...FACET_WIDTHS.map((w) => ({
          id: `width:${w}`,
          label: `${w} mm`,
        })),
      ];
    case "decorativeSandblast":
      return SANDBLAST_FINISHES.filter((item) => item.id !== "none").map(
        (item) => ({ id: item.id, label: item.label }),
      );
    case "cutouts":
      return CUTOUT_TYPES.map((item) => ({ id: item.id, label: item.label }));
    case "accessories":
      return PRODUCT_ACCESSORIES.map((item) => ({
        id: item.id,
        label: item.label,
      }));
    case "logo":
      return BRANDING_OPTIONS.filter((item) => item.id.startsWith("logo")).map(
        (item) => ({ id: item.id, label: item.label }),
      );
    case "antiShatterFilm":
      return [{ id: "enabled", label: "Permite folie anti-ciobire" }];
    case "frontLed":
    case "backLed":
    case "engraving":
      return [{ id: "enabled", label: "Permite activare" }];
    case "width":
    case "height":
      return [];
    default:
      return [];
  }
}

export const FEATURE_SECTIONS: Array<{
  id: string;
  title: string;
  features: ConfiguratorFeatureKey[];
}> = [
  {
    id: "dimensions",
    title: "Dimensiuni și formă",
    features: ["shape", "width", "height"],
  },
  {
    id: "glass",
    title: "Sticlă",
    features: ["glassType"],
  },
  {
    id: "lighting",
    title: "Iluminare",
    features: [
      "frontLed",
      "backLed",
      "ledPosition",
      "ledStripType",
      "lightTemp",
    ],
  },
  {
    id: "control-defog",
    title: "Control și dezaburire",
    features: ["switchType", "defog"],
  },
  {
    id: "processing",
    title: "Prelucrări",
    features: ["decorativeSandblast", "facets", "engraving", "cutouts"],
  },
  {
    id: "frames-accessories",
    title: "Rame și accesorii",
    features: ["frames", "accessories", "logo", "antiShatterFilm"],
  },
];

export const FEATURE_LABELS: Record<ConfiguratorFeatureKey, string> = {
  shape: "Formă",
  width: "Lățime",
  height: "Înălțime",
  glassType: "Tip sticlă",
  frontLed: "LED față",
  backLed: "LED spate",
  ledPosition: "Poziție LED",
  ledStripType: "Tip bandă LED",
  lightTemp: "Temperatură lumină",
  switchType: "Tip întrerupător",
  defog: "Dezaburire",
  frames: "Rame",
  facets: "Fațete",
  decorativeSandblast: "Sablare decorativă",
  engraving: "Gravură",
  cutouts: "Decupaje / găuri",
  accessories: "Accesorii",
  logo: "Logo",
  antiShatterFilm: "Folie anti-ciobire",
};
