const FORBIDDEN_PUBLIC_KEYS = new Set([
  "sinecost",
  "wholesalePrice",
  "wholesale",
  "totalProductionCost",
  "glassCost",
  "componentCosts",
  "operationCosts",
  "laborCost",
  "packagingIncludedCost",
  "serviceCosts",
  "missingCosts",
  "lines",
  "financial",
  "electrical",
  "unitPrice",
  "offerWholesale",
  "offerRetail",
]);

/** Walk a customer payload and report the first internal commercial key. */
export function findForbiddenCommercialKey(
  value: unknown,
  path = "",
): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenCommercialKey(value[index], `${path}[${index}]`);
      if (found) {
        return found;
      }
    }
    return null;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_PUBLIC_KEYS.has(key)) {
      return path ? `${path}.${key}` : key;
    }
    const found = findForbiddenCommercialKey(
      child,
      path ? `${path}.${key}` : key,
    );
    if (found) {
      return found;
    }
  }
  return null;
}
