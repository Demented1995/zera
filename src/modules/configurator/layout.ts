import { LABOR_OPS } from "@/modules/configurator/commercial";
import {
  BRANDING_OPTIONS,
  PRODUCT_ACCESSORIES,
} from "@/modules/configurator/processing";

export const CONFIGURATOR_SECTIONS = [
  {
    id: "geometry",
    label: "Configurare",
    detail: "Formă, dimensiuni și tip de sticlă",
  },
  {
    id: "lighting",
    label: "Iluminare LED",
    detail: "Bandă, întrerupător și difuzor",
  },
  {
    id: "processing",
    label: "Prelucrări",
    detail: "Sablare, fațetă și gravură",
  },
  {
    id: "defog",
    label: "Dezaburire",
    detail: "Film și mod de control",
  },
  {
    id: "frames",
    label: "Rame și fixare",
    detail: "Ramă și tip de montaj",
  },
  {
    id: "cutouts",
    label: "Găuri și decupaje",
    detail: "Decupaje în sticlă",
  },
  {
    id: "accessories",
    label: "Accesorii",
    detail: "Ceas, oglindă măritoare și altele",
  },
  {
    id: "branding",
    label: "Branding și protecție",
    detail: "Logo, vopsire și folie",
  },
  {
    id: "labor",
    label: "Manoperă",
    detail: "Operațiuni de producție",
  },
  {
    id: "packaging",
    label: "Ambalare",
    detail: "Ambalare inclusă sau extra",
  },
  {
    id: "delivery",
    label: "Livrare",
    detail: "Ridicare sau livrare",
  },
  {
    id: "install",
    label: "Montaj",
    detail: "Montarea la client",
  },
  {
    id: "price",
    label: "Nivel preț ofertă",
    detail: "En-gros sau retail",
  },
] as const;

export type ConfiguratorSectionId = (typeof CONFIGURATOR_SECTIONS)[number]["id"];

export type ConfiguratorItemSetting = {
  id: string;
  enabled: boolean;
};

export type ConfiguratorSectionSetting = {
  id: ConfiguratorSectionId;
  enabled: boolean;
  items: ConfiguratorItemSetting[];
};

const SECTION_ITEMS: Record<
  ConfiguratorSectionId,
  ReadonlyArray<{ id: string; label: string }>
> = {
  geometry: [
    { id: "shape", label: "Formă" },
    { id: "dimensions", label: "Dimensiuni" },
    { id: "glass", label: "Tip sticlă" },
  ],
  lighting: [
    { id: "type", label: "Tip iluminare" },
    { id: "front", label: "LED față" },
    { id: "back", label: "LED spate" },
    { id: "diffuser", label: "Difuzor" },
    { id: "switches", label: "Întrerupătoare" },
    { id: "power", label: "Alimentare" },
    { id: "extras", label: "Componente tehnice" },
  ],
  processing: [
    { id: "sandblast", label: "Sablare" },
    { id: "facet", label: "Fațetă" },
    { id: "engraving", label: "Gravură" },
  ],
  defog: [],
  frames: [
    { id: "frame", label: "Tip ramă" },
    { id: "mounting", label: "Tip montaj" },
    { id: "hardware", label: "Componente fixare" },
  ],
  cutouts: [],
  accessories: PRODUCT_ACCESSORIES.map((item) => ({
    id: item.id,
    label: item.label,
  })),
  branding: BRANDING_OPTIONS.map((item) => ({
    id: item.id,
    label: item.label,
  })),
  labor: LABOR_OPS.map((item) => ({ id: item.id, label: item.label })),
  packaging: [],
  delivery: [],
  install: [],
  price: [],
};

const SECTION_IDS = new Set<string>(CONFIGURATOR_SECTIONS.map((section) => section.id));

export function defaultConfiguratorLayout(): ConfiguratorSectionSetting[] {
  return CONFIGURATOR_SECTIONS.map((section) => ({
    id: section.id,
    enabled: true,
    items: SECTION_ITEMS[section.id].map((item) => ({
      id: item.id,
      enabled: true,
    })),
  }));
}

export function configuratorSectionMeta(id: ConfiguratorSectionId) {
  return CONFIGURATOR_SECTIONS.find((section) => section.id === id)!;
}

export function configuratorItemLabel(sectionId: ConfiguratorSectionId, itemId: string) {
  return SECTION_ITEMS[sectionId].find((item) => item.id === itemId)?.label ?? itemId;
}

function normalizeItems(
  sectionId: ConfiguratorSectionId,
  raw: unknown,
): ConfiguratorItemSetting[] {
  const catalog = SECTION_ITEMS[sectionId];
  const allowed = new Set(catalog.map((item) => item.id));
  const seen = new Set<string>();
  const result: ConfiguratorItemSetting[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const id = (item as { id?: unknown }).id;
      if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      result.push({
        id,
        enabled: (item as { enabled?: unknown }).enabled !== false,
      });
    }
  }
  for (const item of catalog) {
    if (!seen.has(item.id)) {
      result.push({ id: item.id, enabled: true });
    }
  }
  return result;
}

/** Keeps a saved order, drops unknown ids, and appends categories added later. */
export function normalizeConfiguratorLayout(raw: unknown): ConfiguratorSectionSetting[] {
  const seen = new Set<string>();
  const result: ConfiguratorSectionSetting[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item || typeof item !== "object") {
        continue;
      }
      const id = (item as { id?: unknown }).id;
      if (typeof id !== "string" || !SECTION_IDS.has(id) || seen.has(id)) {
        continue;
      }
      seen.add(id);
      const sectionId = id as ConfiguratorSectionId;
      result.push({
        id: sectionId,
        enabled: (item as { enabled?: unknown }).enabled !== false,
        items: normalizeItems(sectionId, (item as { items?: unknown }).items),
      });
    }
  }
  for (const section of CONFIGURATOR_SECTIONS) {
    if (!seen.has(section.id)) {
      result.push({
        id: section.id,
        enabled: true,
        items: normalizeItems(section.id, []),
      });
    }
  }
  return result;
}

/**
 * Enabled element ids in the saved order.
 * An empty or missing list means the category has no separate elements, so the fallback stays.
 */
export function visibleConfiguratorItems(
  items: ConfiguratorItemSetting[] | undefined,
  fallback: readonly string[],
): string[] {
  if (!items || items.length === 0) {
    return [...fallback];
  }
  const allowed = new Set<string>(fallback);
  return items
    .filter((item) => item.enabled && allowed.has(item.id))
    .map((item) => item.id);
}

export function moveList<T>(items: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items;
  }
  const next = items.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function moveConfiguratorSection(
  sections: ConfiguratorSectionSetting[],
  from: number,
  to: number,
): ConfiguratorSectionSetting[] {
  return moveList(sections, from, to);
}
