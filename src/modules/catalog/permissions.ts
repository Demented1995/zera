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
