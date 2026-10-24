import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireImageAccess } from "@/modules/catalog/images/access";
import {
  deleteModelImage,
  parseImageKind,
  updateModelImage,
} from "@/modules/catalog/images/service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; imageId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const access = await requireImageAccess("manage");
  if ("error" in access) {
    return access.error;
  }
  const { id, imageId } = await context.params;
  const body = (await request.json().catch(() => null)) as {
    altText?: unknown;
    internalNote?: unknown;
    kind?: unknown;
    isPrimary?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ message: "Date invalide." }, { status: 400 });
  }

  const image = await updateModelImage(prisma, {
    modelId: id,
    imageId,
    altText: typeof body.altText === "string" ? body.altText : undefined,
    internalNote:
      typeof body.internalNote === "string" ? body.internalNote : undefined,
    kind: body.kind === undefined ? undefined : parseImageKind(body.kind),
    isPrimary: body.isPrimary === true ? true : undefined,
  });
  if (!image) {
    return NextResponse.json({ message: "Fotografia nu a fost găsită." }, { status: 404 });
  }
  return NextResponse.json({ image });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireImageAccess("manage");
  if ("error" in access) {
    return access.error;
  }
  const { id, imageId } = await context.params;
  const removed = await deleteModelImage({ db: prisma }, id, imageId);
  if (!removed) {
    return NextResponse.json({ message: "Fotografia nu a fost găsită." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
