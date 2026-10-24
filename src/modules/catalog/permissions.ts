import type { Role } from "@prisma/client";

/** ADMIN may create/edit/duplicate/archive models and manage commercial categories. */
export function canManageCatalog(role: Role): boolean {
  return role === "ADMIN";
}

/** Both roles may view models and load them into the professional configurator. */
export function canViewCatalog(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** Activate commercial models — ADMIN only. */
export function canActivateModels(role: Role): boolean {
  return role === "ADMIN";
}

/** ADMIN may create/edit configurator rules, limits, and allowed options. */
export function canManageConfiguratorRules(role: Role): boolean {
  return role === "ADMIN";
}

/** MANAGER may view rules but cannot change commercial rule structure. */
export function canViewConfiguratorRules(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** ADMIN uploads, reorders, and deletes product photos. */
export function canManageModelImages(role: Role): boolean {
  return role === "ADMIN";
}

/** Both staff roles may view the gallery. */
export function canViewModelImages(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}

/** ADMIN edits commercial copy, descriptive specs, and SEO. */
export function canManageModelContent(role: Role): boolean {
  return role === "ADMIN";
}

/** Both staff roles may read descriptions and SEO. */
export function canViewModelContent(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
