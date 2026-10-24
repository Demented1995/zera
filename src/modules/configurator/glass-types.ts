export type ConfiguratorGlassType = {
  id: string;
  label: string;
  /** Only Standard has confirmed catalog rates in Stage 5.1. */
  hasConfirmedPricing: boolean;
};

export const CONFIGURATOR_GLASS_TYPES: ConfiguratorGlassType[] = [
  { id: "standard", label: "Standard", hasConfirmedPricing: true },
  { id: "diamant", label: "Diamant", hasConfirmedPricing: false },
  { id: "bronz", label: "Bronz", hasConfirmedPricing: false },
  { id: "gri", label: "Gri", hasConfirmedPricing: false },
  { id: "antichizata", label: "Antichizată", hasConfirmedPricing: false },
];

export function getGlassTypeById(id: string): ConfiguratorGlassType | undefined {
  return CONFIGURATOR_GLASS_TYPES.find((type) => type.id === id);
}
