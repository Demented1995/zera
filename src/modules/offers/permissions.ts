import type { Role } from "@prisma/client";

/** Both ADMIN and MANAGER may create/edit/duplicate configs and create/issue offers. */
export function canManageConfigurations(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

export function canManageOffers(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Sinecost visibility — ADMIN always; MANAGER sees per existing pricing rules (staff calculator). */
export function canViewSinecost(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Global company legal settings for PDFs — ADMIN only. */
export function canEditCompanySettings(role: Role): boolean {
  return role === "ADMIN";
}

/** Global formulas/tariffs remain ADMIN-only (existing Stage 4 rule). */
export function canEditGlobalTariffs(role: Role): boolean {
  return role === "ADMIN";
}
