import type { ConfiguratorSectionId, ConfiguratorSectionSetting } from "@/modules/configurator/layout";
import { DELIVERY_TYPES, INSTALL_TYPES } from "@/modules/configurator/commercial";
import { FRAME_TYPES, SANDBLAST_FINISHES } from "@/modules/configurator/processing";
import type { OfferTechSummary } from "@/modules/offers/snapshots";

export type ConclusionRow = {
  label: string;
  value: string;
};

const FEATURE_RULES: Array<{
  prefix: string;
  section: ConfiguratorSectionId;
  item?: string;
}> = [
  { prefix: "LED față", section: "lighting", item: "front" },
  { prefix: "LED spate", section: "lighting", item: "back" },
  { prefix: "Întrerupător", section: "lighting", item: "switches" },
  { prefix: "Sablare", section: "processing", item: "sandblast" },
  { prefix: "Fațetă", section: "processing", item: "facet" },
  { prefix: "Gravură", section: "processing", item: "engraving" },
  { prefix: "Dezaburire", section: "defog" },
  { prefix: "Ramă", section: "frames", item: "frame" },
  { prefix: "Livrare", section: "delivery" },
  { prefix: "Montaj", section: "install" },
];

function sectionAllows(
  layout: ConfiguratorSectionSetting[],
  sectionId: ConfiguratorSectionId,
  itemId?: string,
): boolean {
  const section = layout.find((item) => item.id === sectionId);
  if (!section?.enabled) {
    return false;
  }
  if (!itemId || section.items.length === 0) {
    return true;
  }
  const item = section.items.find((entry) => entry.id === itemId);
  return item ? item.enabled : true;
}

function named(options: ReadonlyArray<{ id: string; label: string }>, id: string): string {
  return options.find((item) => item.id === id)?.label ?? id;
}

function featureRow(feature: string): ConclusionRow {
  const split = feature.indexOf(": ");
  if (split === -1) {
    return { label: feature, value: "" };
  }
  const label = feature.slice(0, split);
  const raw = feature.slice(split + 2);
  const value =
    label === "Sablare"
      ? named(SANDBLAST_FINISHES, raw)
      : label === "Livrare"
        ? named(DELIVERY_TYPES, raw)
        : label === "Montaj"
          ? named(INSTALL_TYPES, raw)
          : label === "Ramă"
            ? named(FRAME_TYPES, raw)
            : raw;
  return { label, value };
}

/** Rows limited to sections the professional configurator currently shows. */
export function professionalConclusionRows(
  summary: OfferTechSummary | null,
  layout: ConfiguratorSectionSetting[],
): ConclusionRow[] {
  if (!summary) {
    return [];
  }
  const rows: ConclusionRow[] = [];
  if (sectionAllows(layout, "geometry", "shape")) {
    rows.push({ label: "Formă", value: summary.shapeLabel });
  }
  if (sectionAllows(layout, "geometry", "dimensions")) {
    rows.push({ label: "Înălțime", value: `${Math.round(summary.heightMm)} mm` });
    rows.push({ label: "Lățime", value: `${Math.round(summary.widthMm)} mm` });
  }
  if (sectionAllows(layout, "geometry", "glass")) {
    rows.push({ label: "Sticlă", value: summary.glassTypeLabel });
  }
  if (sectionAllows(layout, "lighting", "type")) {
    rows.push({ label: "Iluminare", value: summary.lightingLabel });
  }
  for (const feature of summary.features) {
    if (feature.startsWith("Tip montare")) {
      rows.push(featureRow(feature));
      continue;
    }
    const rule = FEATURE_RULES.find(
      (item) => feature === item.prefix || feature.startsWith(`${item.prefix}:`) || feature.startsWith(`${item.prefix} `),
    );
    if (!rule || !sectionAllows(layout, rule.section, rule.item)) {
      continue;
    }
    rows.push(featureRow(feature));
  }
  return rows;
}
