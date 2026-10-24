import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { requireImageAccess } from "@/modules/catalog/images/access";
import {
  listModelImages,
  parseImageKind,
  uploadModelImage,
} from "@/modules/catalog/images/service";
import { ImageUploadError } from "@/modules/media/process";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const access = await requireImageAccess("view");
  if ("error" in access) {
    return access.error;
  }
  const { id } = await context.params;
  const model = await prisma.mirrorModel.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!model) {
    return NextResponse.json({ message: "Modelul nu a fost găsit." }, { status: 404 });
  }
  const images = await listModelImages(prisma, id);
  return NextResponse.json({ images });
}

export async function POST(request: Request, context: RouteContext) {
  const access = await requireImageAccess("manage");
  if ("error" in access) {
    return access.error;
  }
  const { id } = await context.params;
  const form = await request.formData();
  const files = form
    .getAll("files")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (files.length === 0) {
    return NextResponse.json(
      { message: "Selectați cel puțin o imagine." },
      { status: 400 },
    );
  }

  const kind = parseImageKind(form.get("kind"));
  const altText = String(form.get("altText") ?? "");
  const internalNote = String(form.get("internalNote") ?? "");
  const images = [];
  const errors: Array<{ fileName: string; message: string }> = [];

  for (const file of files) {
    try {
      const bytes = Buffer.from(await file.arrayBuffer());
      const image = await uploadModelImage(
        { db: prisma },
        {
          modelId: id,
          userId: access.session.user.id,
          bytes,
          kind,
          altText,
          internalNote,
          originalName: file.name,
        },
      );
      images.push(image);
    } catch (error) {
      const message =
        error instanceof ImageUploadError
          ? error.message
          : error instanceof Error && error.message === "Modelul nu a fost găsit."
            ? error.message
            : "Imaginea nu a putut fi salvată.";
      errors.push({ fileName: file.name || "imagine", message });
      if (message === "Modelul nu a fost găsit.") {
        return NextResponse.json({ message, images, errors }, { status: 404 });
      }
    }
  }

  return NextResponse.json(
    { images, errors },
    { status: images.length > 0 ? 200 : 400 },
  );
}
