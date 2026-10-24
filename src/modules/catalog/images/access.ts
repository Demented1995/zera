import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import {
  canManageModelImages,
  canViewModelImages,
} from "@/modules/catalog/permissions";

export async function requireImageAccess(mode: "view" | "manage") {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id || !role || !canViewModelImages(role)) {
    return {
      error: NextResponse.json(
        { message: "Autentificare necesară." },
        { status: 401 },
      ),
    };
  }
  if (mode === "manage" && !canManageModelImages(role)) {
    return {
      error: NextResponse.json(
        { message: "Doar administratorul poate modifica fotografiile." },
        { status: 403 },
      ),
    };
  }
  return { session };
}
