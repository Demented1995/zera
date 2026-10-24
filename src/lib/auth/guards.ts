import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";
import {
  canAccess,
  type AdminAccess,
} from "@/lib/auth/permissions";

const STAFF_ROLES: Role[] = ["ADMIN", "MANAGER"];

export async function requireStaffSession() {
  const session = await auth();

  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    redirect("/login");
  }

  return session;
}

export async function requireAdminSession() {
  const session = await requireStaffSession();

  if (session.user.role !== "ADMIN") {
    redirect("/admin");
  }

  return session;
}

export async function requirePageAccess(access: AdminAccess) {
  const session = await requireStaffSession();

  if (!canAccess(session.user.role, access)) {
    redirect("/admin");
  }

  return session;
}
