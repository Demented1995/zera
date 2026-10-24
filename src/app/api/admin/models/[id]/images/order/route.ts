import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireImageAccess } from "@/modules/catalog/images/access";
import { reorderModelImages } from "@/modules/catalog/images/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireImageAccess("manage");
  if ("error" in access) {
    return access.error;
  }
  const { id } = await context.params;
  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null;
  if (!body || !Array.isArray(body.ids) || body.ids.some((item) => typeof item !== "string")) {
    return NextResponse.json({ message: "Ordinea este invalidă." }, { status: 400 });
  }
  const images = await reorderModelImages(prisma, id, body.ids);
  if (!images) {
    return NextResponse.json(
      { message: "Ordinea nu corespunde fotografiilor modelului." },
      { status: 400 },
    );
  }
  return NextResponse.json({ images });
}
