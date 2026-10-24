"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { MATERIAL_CURRENCY } from "@/modules/materials/constants";
import { slugifyCategoryName } from "@/modules/materials/format";
import { canManageMaterials } from "@/modules/materials/permissions";
import {
  categoryFormSchema,
  categoryUpdateSchema,
  materialFormSchema,
  materialUpdateSchema,
} from "@/modules/materials/schemas";

export type ActionResult =
  | { ok: true; message: string; id?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

async function requireMaterialsAdmin() {
  const session = await requireStaffSession();
  if (!canManageMaterials(session.user.role)) {
    return { session: null, error: "Nu aveți permisiunea de a modifica materialele." as const };
  }
  return { session, error: null };
}

function pricesEqual(
  a: Prisma.Decimal | null,
  b: Prisma.Decimal | null,
): boolean {
  if (a === null && b === null) {
    return true;
  }
  if (a === null || b === null) {
    return false;
  }
  return a.equals(b);
}

function toDecimalOrNull(value: string | null): Prisma.Decimal | null {
  if (value === null) {
    return null;
  }
  return new Prisma.Decimal(value);
}

export async function createMaterialAction(
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  const parsed = materialFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați câmpurile formularului.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const category = await prisma.materialCategory.findFirst({
    where: { id: data.categoryId, isActive: true },
  });
  if (!category) {
    return { ok: false, message: "Categoria selectată nu este validă." };
  }

  if (data.internalCode) {
    const existingCode = await prisma.material.findUnique({
      where: { internalCode: data.internalCode },
    });
    if (existingCode) {
      return { ok: false, message: "Codul intern este deja folosit." };
    }
  }

  const unitPrice = toDecimalOrNull(data.unitPrice);

  const material = await prisma.material.create({
    data: {
      name: data.name,
      internalCode: data.internalCode ?? null,
      categoryId: data.categoryId,
      unitPrice,
      unitOfMeasure: data.unitOfMeasure,
      currency: MATERIAL_CURRENCY,
      description: data.description ?? null,
      isActive: data.isActive,
    },
  });

  if (unitPrice !== null) {
    await prisma.materialPriceHistory.create({
      data: {
        materialId: material.id,
        previousPrice: null,
        newPrice: unitPrice,
        changedById: auth.session.user.id,
      },
    });
  }

  revalidatePath("/admin/materiale");
  return { ok: true, message: "Materialul a fost creat.", id: material.id };
}

export async function updateMaterialAction(
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  const parsed = materialUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați câmpurile formularului.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const existing = await prisma.material.findUnique({ where: { id: data.id } });
  if (!existing) {
    return { ok: false, message: "Materialul nu a fost găsit." };
  }

  const category = await prisma.materialCategory.findFirst({
    where: { id: data.categoryId },
  });
  if (!category) {
    return { ok: false, message: "Categoria selectată nu este validă." };
  }

  if (data.internalCode) {
    const clash = await prisma.material.findFirst({
      where: {
        internalCode: data.internalCode,
        NOT: { id: data.id },
      },
    });
    if (clash) {
      return { ok: false, message: "Codul intern este deja folosit." };
    }
  }

  const unitPrice = toDecimalOrNull(data.unitPrice);
  const priceChanged = !pricesEqual(existing.unitPrice, unitPrice);

  await prisma.$transaction(async (tx) => {
    await tx.material.update({
      where: { id: data.id },
      data: {
        name: data.name,
        internalCode: data.internalCode ?? null,
        categoryId: data.categoryId,
        unitPrice,
        unitOfMeasure: data.unitOfMeasure,
        currency: MATERIAL_CURRENCY,
        description: data.description ?? null,
        isActive: data.isActive,
      },
    });

    if (priceChanged) {
      await tx.materialPriceHistory.create({
        data: {
          materialId: data.id,
          previousPrice: existing.unitPrice,
          newPrice: unitPrice,
          changedById: auth.session!.user.id,
        },
      });
    }
  });

  revalidatePath("/admin/materiale");
  return { ok: true, message: "Materialul a fost actualizat.", id: data.id };
}

export async function setMaterialActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  const existing = await prisma.material.findUnique({ where: { id } });
  if (!existing) {
    return { ok: false, message: "Materialul nu a fost găsit." };
  }

  await prisma.material.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/materiale");
  return {
    ok: true,
    message: isActive
      ? "Materialul a fost reactivat."
      : "Materialul a fost dezactivat.",
  };
}

export async function createCategoryAction(
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  const parsed = categoryFormSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați numele categoriei.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const name = parsed.data.name;
  const baseSlug = slugifyCategoryName(name) || `categorie-${Date.now()}`;
  let slug = baseSlug;
  let suffix = 1;
  while (await prisma.materialCategory.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${suffix++}`;
  }

  const maxSort = await prisma.materialCategory.aggregate({
    _max: { sortOrder: true },
  });

  try {
    const category = await prisma.materialCategory.create({
      data: {
        name,
        slug,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 10,
        isActive: true,
      },
    });
    revalidatePath("/admin/materiale");
    return { ok: true, message: "Categoria a fost creată.", id: category.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "Există deja o categorie cu acest nume." };
    }
    throw error;
  }
}

export async function renameCategoryAction(
  raw: unknown,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  const parsed = categoryUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați numele categoriei.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await prisma.materialCategory.update({
      where: { id: parsed.data.id },
      data: { name: parsed.data.name },
    });
    revalidatePath("/admin/materiale");
    return { ok: true, message: "Categoria a fost redenumită." };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false, message: "Există deja o categorie cu acest nume." };
    }
    return { ok: false, message: "Categoria nu a putut fi actualizată." };
  }
}

export async function setCategoryActiveAction(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const auth = await requireMaterialsAdmin();
  if (auth.error || !auth.session) {
    return { ok: false, message: auth.error ?? "Neautorizat" };
  }

  await prisma.materialCategory.update({
    where: { id },
    data: { isActive },
  });

  revalidatePath("/admin/materiale");
  return {
    ok: true,
    message: isActive
      ? "Categoria a fost reactivată."
      : "Categoria a fost dezactivată.",
  };
}
