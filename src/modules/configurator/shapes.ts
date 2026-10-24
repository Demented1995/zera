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

/**
 * Stable shape IDs for Stage 5.1.
 * Only shapes with confirmed engine mapping get priced area rules.
 */
export const CONFIGURATOR_SHAPES: ConfiguratorShape[] = [
  {
    id: "rectangular",
    label: "Dreptunghiulară",
    description: "Formă dreptunghiulară / pătrată fără adaosuri pe laturi.",
    engineShape: "RECTANGLE",
    edgeMode: "none",
  },
  {
    id: "rounded-rect",
    label: "Dreptunghi rotunjit",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "round",
    label: "Rotundă",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "capsule",
    label: "Oval capsulă",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "ellipse",
    label: "Oval elipsă",
    description: "Formă specială cu adaos standard pe toate laturile curbe.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: true, right: true, top: true, bottom: true },
  },
  {
    id: "asymmetric",
    label: "Asimetrică",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "arcade",
    label: "Arcadă",
    description: "Formă specială cu adaos pe stânga, dreapta și sus.",
    engineShape: "SPECIAL",
    edgeMode: "preset",
    presetEdges: { left: true, right: true, top: true, bottom: false },
  },
  {
    id: "semicircle",
    label: "Semicerc",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "sail",
    label: "Velă",
    description: "Formula geometrică de adaos nu este încă confirmată.",
    engineShape: null,
    edgeMode: "unavailable",
  },
  {
    id: "custom",
    label: "Personalizată",
    description: "Adaosuri manuale pe fiecare latură (mm), definite de operator.",
    engineShape: "SPECIAL",
    edgeMode: "manual",
  },
];

export function getShapeById(id: string): ConfiguratorShape | undefined {
  return CONFIGURATOR_SHAPES.find((shape) => shape.id === id);
}
