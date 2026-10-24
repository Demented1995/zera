import type { Role } from "@prisma/client";

export function canEditPricingRules(role: Role): boolean {
  return role === "ADMIN";
}

export function canUsePricingCalculator(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
