import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { publicImageAllowed } from "@/modules/shop/catalog";
import { createImageStorage, extensionForMime, variantStorageKey } from "@/modules/media/storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ modelId: string; imageId: string; variant: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { modelId, imageId, variant } = await context.params;
  if (variant !== "display" && variant !== "thumb" && variant !== "original") {
    return NextResponse.json({ message: "Variantă necunoscută." }, { status: 404 });
  }

  const session = await auth();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "MANAGER";
  if (!isStaff && !(await publicImageAllowed(modelId, variant))) {
    return NextResponse.json({ message: "Fotografia nu a fost găsită." }, { status: 404 });
  }

  const image = await prisma.mirrorModelImage.findFirst({
    where: { id: imageId, modelId },
    select: { storageKey: true, mimeType: true },
  });
  if (!image) {
    return NextResponse.json({ message: "Fotografia nu a fost găsită." }, { status: 404 });
  }

  const key = variantStorageKey(
    image.storageKey,
    variant,
    extensionForMime(image.mimeType),
  );
  const body = await createImageStorage().read(key);
  if (!body) {
    return NextResponse.json({ message: "Fișierul lipsește." }, { status: 404 });
  }

  const contentType = variant === "original" ? image.mimeType : "image/webp";
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": isStaff ? "private, max-age=3600" : "public, max-age=3600",
    },
  });
}
