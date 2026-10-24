import type { Role } from "@prisma/client";

/** ADMIN and MANAGER may create, edit, archive, and read customer records. */
export function canManageCustomers(role: Role): boolean {
  return role === "ADMIN" || role === "MANAGER";
}
