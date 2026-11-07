import { prisma } from "@/lib/db/prisma";
import {
  defaultConfiguratorLayout,
  normalizeConfiguratorLayout,
  type ConfiguratorSectionSetting,
} from "@/modules/configurator/layout";

export async function getConfiguratorLayout(): Promise<ConfiguratorSectionSetting[]> {
  const row = await prisma.configuratorLayout.findUnique({
    where: { id: "default" },
  });
  if (!row) {
    return defaultConfiguratorLayout();
  }
  return normalizeConfiguratorLayout(row.sections);
}

export async function saveConfiguratorLayout(
  sections: ConfiguratorSectionSetting[],
): Promise<ConfiguratorSectionSetting[]> {
  const normalized = normalizeConfiguratorLayout(sections);
  await prisma.configuratorLayout.upsert({
    where: { id: "default" },
    create: { id: "default", sections: normalized },
    update: { sections: normalized },
  });
  return normalized;
}
