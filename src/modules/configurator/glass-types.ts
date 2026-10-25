import { UNPRICED_SEED } from "@/modules/materials/unpriced-catalog";

export type ConfiguratorGlassType = {
  id: string;
  label: string;
  /** Standard uses the shape glass rate. Other types use their own catalog material. */
  hasConfirmedPricing: boolean;
  materialSeedKey: string | null;
};

export const CONFIGURATOR_GLASS_TYPES: ConfiguratorGlassType[] = [
  { id: "standard", label: "Standard", hasConfirmedPricing: true, materialSeedKey: null },
  { id: "diamant", label: "Diamant", hasConfirmedPricing: false, materialSeedKey: UNPRICED_SEED.glassDiamant },
  { id: "bronz", label: "Bronz", hasConfirmedPricing: false, materialSeedKey: UNPRICED_SEED.glassBronz },
  { id: "gri", label: "Gri", hasConfirmedPricing: false, materialSeedKey: UNPRICED_SEED.glassGri },
  { id: "antichizata", label: "Antichizată", hasConfirmedPricing: false, materialSeedKey: UNPRICED_SEED.glassAntichizata },
];

export function getGlassTypeById(id: string): ConfiguratorGlassType | undefined {
  return CONFIGURATOR_GLASS_TYPES.find((type) => type.id === id);
}
