import type { Role } from "@prisma/client";

export function canManageMaterials(role: Role): boolean {
  return role === "ADMIN";
}

export function canViewMaterials(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
