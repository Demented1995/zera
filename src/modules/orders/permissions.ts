import type { Role } from "@prisma/client";

/** ADMIN and MANAGER may place, view, and update orders. */
export function canManageOrders(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
