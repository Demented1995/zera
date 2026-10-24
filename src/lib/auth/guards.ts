import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/lib/auth";

const STAFF_ROLES: Role[] = ["ADMIN", "MANAGER"];

export async function requireStaffSession() {
  const session = await auth();

  if (!session?.user || !STAFF_ROLES.includes(session.user.role)) {
    redirect("/login");
  }

  return session;
}
