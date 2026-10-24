import { clearInactiveComponents } from "@/modules/catalog/preview/view";
import type { PreviewControl } from "@/modules/catalog/preview/types";
import { validateCustomerConfig } from "@/modules/catalog/rules";
import type {
  ConfiguratorRulesV1,
  CustomerConfigRequest,
} from "@/modules/catalog/rules/types";
import { quoteConfigurator } from "@/modules/configurator/map-to-engine";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";
import { acceptedRetailPrice } from "@/modules/orders/public";
import type { CatalogMaterial, PricingRules } from "@/modules/pricing/engine";

type SelectControl = Extract<PreviewControl, { kind: "select" }>;

type QuoteInput = {
  controls: PreviewControl[];
  selection: CustomerConfigRequest;
  modelDefault: ConfiguratorState;
  rules: ConfiguratorRulesV1;
  materials: CatalogMaterial[];
  pricingRules: PricingRules;
};

/**
 * Retail supplement of each allowed choice versus the value saved on the model.
 * Uses the existing quote. Does not invent a price when the quote is incomplete.
 */
export function applyRetailSupplements(input: QuoteInput): PreviewControl[] {
  const cache = new Map<string, number | null>();

  function retail(request: CustomerConfigRequest): number | null {
    const key = JSON.stringify(request);
    const cached = cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const validated = validateCustomerConfig({
      modelDefault: input.modelDefault,
      rules: input.rules,
      request,
    });
    if (!validated.ok) {
      cache.set(key, null);
      return null;
    }
    const quote = quoteConfigurator({
      state: clearInactiveComponents(validated.config),
      materials: input.materials,
      rules: input.pricingRules,
    });
    const price = acceptedRetailPrice(quote.calculation);
    cache.set(key, price);
    return price;
  }

  return input.controls.map((control) => {
    if (control.kind !== "select") {
      return control;
    }
    return withSelectSupplements(control, input.selection, retail);
  });
}

function withSelectSupplements(
  control: SelectControl,
  selection: CustomerConfigRequest,
  retail: (request: CustomerConfigRequest) => number | null,
): SelectControl {
  const baselineRequest = omitField(selection, control.field);
  const baseline = retail(baselineRequest);
  return {
    ...control,
    options: control.options.map((option) => {
      if (baseline == null || option.id === "") {
        return { ...option, supplementMdl: null };
      }
      const value = control.numeric ? Number(option.id) : option.id;
      const price = retail({
        ...baselineRequest,
        [control.field]: value,
      } as CustomerConfigRequest);
      if (price == null) {
        return { ...option, supplementMdl: null };
      }
      return {
        ...option,
        supplementMdl: Math.round((price - baseline) * 100) / 100,
      };
    }),
  };
}

function omitField(
  selection: CustomerConfigRequest,
  field: SelectControl["field"],
): CustomerConfigRequest {
  const next: CustomerConfigRequest = { ...selection };
  delete next[field];
  return next;
}
