export {
  CUSTOMER_DIMENSION_MAX_MM,
  CUSTOMER_DIMENSION_MIN_MM,
  defaultCompatibilityRules,
  defaultConfiguratorRules,
  newModelConfiguratorRules,
  resolveConfiguratorRules,
} from "@/modules/catalog/rules/defaults";
export {
  FEATURE_LABELS,
  FEATURE_SECTIONS,
  optionCatalogForFeature,
} from "@/modules/catalog/rules/option-catalog";
export {
  validateCustomerConfig,
  validateRulesConsistency,
} from "@/modules/catalog/rules/validate";
export type {
  CompatibilityRule,
  ConfiguratorFeatureKey,
  ConfiguratorRulesV1,
  CustomerConfigRequest,
  FeatureMode,
  FeatureRule,
  ValidateCustomerConfigResult,
  ValidationIssue,
} from "@/modules/catalog/rules/types";
export { CONFIGURATOR_FEATURE_KEYS } from "@/modules/catalog/rules/types";
