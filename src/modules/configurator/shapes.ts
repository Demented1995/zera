import type { GlassShapeKind } from "@/modules/pricing/engine";

export type ShapeEdgeMode = "none" | "preset" | "manual" | "unavailable";

export type ShapePresetEdges = {
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
};

export type ConfiguratorShape = {
  id: string;
  label: string;
  description: string;
  /** Engine shape when a confirmed rule exists; null = no confirmed geometric formula. */
  engineShape: GlassShapeKind | null;
  edgeMode: ShapeEdgeMode;
  /** Used only when edgeMode === "preset". */
  presetEdges?: ShapePresetEdges;
};

const ALL_CURVED: ShapePresetEdges = {
  left: true,
  right: true,
  top: true,
  bottom: true,
};

const NONE_CURVED: ShapePresetEdges = {
  left: false,
  right: false,
  top: false,
  bottom: false,
};

/**
 * Square and rectangle use the raw bounding box.
 * Every other shape uses the special-glass rate and +5 cm on each curved side.
 */
export const CONFIGURATOR_SHAPES: ConfiguratorShape[] = [
  {
    id: "rectangular",
    label: "Dreptunghiulară",
    description:
      "Pătrat și dreptunghi: lățime × înălțime, fără adaos pe laturi.",
    engineShape: "RECTANGLE",
    edgeMode: "none",
  },
  {
    id: "rounded-rect",
    label: "Dreptunghi rotunjit",
    description:
      "Tarif forme speciale, plus 5 cm pe toate cele 4 laturi (colțuri rotunjite).",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: ALL_CURVED,
  },
  {
    id: "round",
    label: "Rotundă",
    description: "Tarif forme speciale, plus 5 cm pe toate cele 4 laturi.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: ALL_CURVED,
  },
  {
    id: "capsule",
    label: "Oval capsulă",
    description:
      "Tarif forme speciale, plus 5 cm pe cele două capete semicirculare: sus și jos când oglinda e mai înaltă, stânga și dreapta când e mai lată.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: false, right: false, top: true, bottom: true },
  },
  {
    id: "ellipse",
    label: "Oval elipsă",
    description: "Tarif forme speciale, plus 5 cm pe toate cele 4 laturi.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: ALL_CURVED,
  },
  {
    id: "asymmetric",
    label: "Asimetrică",
    description:
      "Tarif forme speciale. Contur fără latură dreaptă: plus 5 cm pe toate cele 4 laturi.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: ALL_CURVED,
  },
  {
    id: "arcade",
    label: "Arcadă",
    description:
      "Tarif forme speciale, plus 5 cm pe stânga, dreapta și sus. Baza dreaptă rămâne fără adaos.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: true, right: true, top: true, bottom: false },
  },
  {
    id: "semicircle",
    label: "Semicerc",
    description:
      "Tarif forme speciale, plus 5 cm pe stânga, dreapta și arc (sus). Baza dreaptă rămâne fără adaos.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: true, right: true, top: true, bottom: false },
  },
  {
    id: "sail",
    label: "Velă",
    description:
      "Tarif forme speciale, plus 5 cm pe sus și dreapta. Stânga și jos sunt drepte.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: false, right: true, top: true, bottom: false },
  },
  {
    id: "custom",
    label: "Personalizată",
    description: "Tarif forme speciale, plus 5 cm pe toate cele 4 laturi.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: ALL_CURVED,
  },
];

export function getShapeById(id: string): ConfiguratorShape | undefined {
  return CONFIGURATOR_SHAPES.find((shape) => shape.id === id);
}

/** Which bounding-box sides receive the standard 5 cm add. */
export function curvedEdgesForShape(
  shape: ConfiguratorShape,
  widthMm: number,
  heightMm: number,
): ShapePresetEdges {
  if (shape.id === "capsule") {
    if (widthMm === heightMm) {
      return ALL_CURVED;
    }
    if (widthMm > heightMm) {
      return { left: true, right: true, top: false, bottom: false };
    }
    return { left: false, right: false, top: true, bottom: true };
  }

  return shape.presetEdges ?? NONE_CURVED;
}
