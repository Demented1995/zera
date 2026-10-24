"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { nextModelCode } from "@/modules/catalog/codes";
import {
  canActivateModels,
  canManageCatalog,
  canViewCatalog,
} from "@/modules/catalog/permissions";
import {
  archiveMirrorModelSchema,
  duplicateMirrorModelSchema,
  modelCategorySchema,
  saveMirrorModelSchema,
} from "@/modules/catalog/schemas";
import { isValidSlug, slugifyModelName } from "@/modules/catalog/slug";
import {
  assertCanActivate,
  deriveCalcStatus,
} from "@/modules/catalog/status";
import { getShapeById } from "@/modules/configurator/shapes";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";

export type ActionResult =
  | { ok: true; message: string; id?: string; code?: string; slug?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return new Prisma.Decimal(value);
}

function revalidateCatalog() {
  revalidatePath("/admin/modele");
  revalidatePath("/admin/categorii");
  revalidatePath("/admin/produse");
}

export async function saveMirrorCategoryAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageCatalog(session.user.role)) {
    return {
      ok: false,
      message: "Nu aveți permisiunea de a gestiona categoriile comerciale.",
    };
  }

  const parsed = modelCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele categoriei.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  if (!isValidSlug(data.slug)) {
    return { ok: false, message: "Slug-ul categoriei este invalid." };
  }

  const slugConflict = await prisma.mirrorModelCategory.findFirst({
    where: {
      slug: data.slug,
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
  });
  if (slugConflict) {
    return { ok: false, message: "Slug-ul categoriei este deja folosit." };
  }

  const nameConflict = await prisma.mirrorModelCategory.findFirst({
    where: {
      name: data.name,
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
  });
  if (nameConflict) {
    return { ok: false, message: "Numele categoriei este deja folosit." };
  }

  if (data.id) {
    await prisma.mirrorModelCategory.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description ?? null,
        sortOrder: data.sortOrder,
        isActive: data.isActive ?? true,
      },
    });
    revalidateCatalog();
    return { ok: true, message: "Categoria a fost actualizată.", id: data.id };
  }

  const created = await prisma.mirrorModelCategory.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description ?? null,
      sortOrder: data.sortOrder,
      isActive: data.isActive ?? true,
      createdById: session.user.id,
    },
  });
  revalidateCatalog();
  return { ok: true, message: "Categoria a fost creată.", id: created.id };
}

export async function saveMirrorModelAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageCatalog(session.user.role)) {
    return {
      ok: false,
      message: "Nu aveți permisiunea de a modifica catalogul comercial.",
    };
  }

  const parsed = saveMirrorModelSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele modelului.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  if (!isValidSlug(data.slug)) {
    return { ok: false, message: "Slug-ul modelului este invalid." };
  }

  const category = await prisma.mirrorModelCategory.findFirst({
    where: { id: data.categoryId, isActive: true },
  });
  if (!category) {
    return { ok: false, message: "Categoria comercială nu este validă." };
  }

  const slugConflict = await prisma.mirrorModel.findFirst({
    where: {
      slug: data.slug,
      ...(data.id ? { NOT: { id: data.id } } : {}),
    },
  });
  if (slugConflict) {
    return { ok: false, message: "Slug-ul este deja folosit de alt model." };
  }

  const { state, calculation, blockers } = await recalculateFromConfigPayload(
    data.config,
  );

  if (!Number.isFinite(state.widthMm) || !Number.isFinite(state.heightMm)) {
    return { ok: false, message: "Dimensiuni invalide." };
  }
  if (state.widthMm <= 0 || state.heightMm <= 0) {
    return { ok: false, message: "Dimensiunile trebuie să fie pozitive." };
  }

  const calcStatus = deriveCalcStatus(calculation);
  let status = data.status;

  if (status === "ACTIVE") {
    if (!canActivateModels(session.user.role)) {
      return { ok: false, message: "Doar ADMIN poate activa modelele." };
    }
    const block = assertCanActivate(calcStatus, state.widthMm, state.heightMm);
    if (block) {
      return { ok: false, message: block };
    }
    if (blockers.length > 0) {
      return {
        ok: false,
        message: `Configurație tehnică invalidă: ${blockers.slice(0, 3).join("; ")}`,
      };
    }
  }

  // Incomplete calc cannot become ACTIVE — coerce to DRAFT on save.
  if (status !== "ARCHIVED" && calcStatus !== "COMPLETE") {
    status = "DRAFT";
  }

  const shape = getShapeById(state.shapeId);
  const userId = session.user.id;

  const rowData = {
    name: data.name,
    slug: data.slug,
    shortDescription: data.shortDescription ?? null,
    fullDescription: data.fullDescription ?? null,
    categoryId: data.categoryId,
    status,
    // Stage 6.1: never auto-publish to public site.
    isPublished: false,
    configJson: state as unknown as Prisma.InputJsonValue,
    calculationJson: (calculation ?? {
      status: "INCOMPLETE",
      missingCosts: blockers,
    }) as unknown as Prisma.InputJsonValue,
    calcStatus,
    shapeId: state.shapeId,
    shapeLabel: shape?.label ?? state.shapeId,
    glassTypeId: state.glassTypeId,
    defaultWidthMm: new Prisma.Decimal(state.widthMm),
    defaultHeightMm: new Prisma.Decimal(state.heightMm),
    // Stage 6.2 placeholders — do not invent commercial limits.
    minWidthMm: null,
    maxWidthMm: null,
    minHeightMm: null,
    maxHeightMm: null,
    sinecost: decimalOrNull(calculation?.totalProductionCost ?? null),
    wholesalePrice: decimalOrNull(calculation?.wholesalePrice ?? null),
    retailPrice: decimalOrNull(calculation?.retailPrice ?? null),
    sourceConfigurationId: data.sourceConfigurationId ?? null,
    updatedById: userId,
  };

  if (data.id) {
    const existing = await prisma.mirrorModel.findUnique({
      where: { id: data.id },
    });
    if (!existing) {
      return { ok: false, message: "Modelul nu a fost găsit." };
    }

    // Editing a model never mutates issued offer revisions (prices live in OfferRevision).
    const updated = await prisma.mirrorModel.update({
      where: { id: data.id },
      data: rowData,
    });
    revalidateCatalog();
    revalidatePath(`/admin/modele/${updated.id}`);
    return {
      ok: true,
      message:
        status === "DRAFT" && data.status === "ACTIVE"
          ? "Salvat ca ciornă (calcul incomplet — activarea a fost blocată)."
          : "Modelul a fost actualizat.",
      id: updated.id,
      code: updated.code,
      slug: updated.slug,
    };
  }

  const code = await nextModelCode();
  const created = await prisma.mirrorModel.create({
    data: {
      ...rowData,
      code,
      createdById: userId,
    },
  });
  revalidateCatalog();
  return {
    ok: true,
    message: "Modelul a fost creat.",
    id: created.id,
    code: created.code,
    slug: created.slug,
  };
}

export async function duplicateMirrorModelAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageCatalog(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a duplica modele." };
  }

  const parsed = duplicateMirrorModelSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Model invalid." };
  }

  const source = await prisma.mirrorModel.findUnique({
    where: { id: parsed.data.id },
  });
  if (!source) {
    return { ok: false, message: "Modelul sursă nu a fost găsit." };
  }

  const code = await nextModelCode();
  const baseSlug = slugifyModelName(`copie-${source.slug}`);
  let slug = baseSlug;
  let attempt = 1;
  while (await prisma.mirrorModel.findUnique({ where: { slug } })) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const copy = await prisma.mirrorModel.create({
    data: {
      code,
      name: `Copie — ${source.name}`,
      slug,
      shortDescription: source.shortDescription,
      fullDescription: source.fullDescription,
      categoryId: source.categoryId,
      status: "DRAFT",
      isPublished: false,
      configJson: source.configJson as Prisma.InputJsonValue,
      calculationJson: source.calculationJson as Prisma.InputJsonValue | undefined,
      calcStatus: source.calcStatus,
      shapeId: source.shapeId,
      shapeLabel: source.shapeLabel,
      glassTypeId: source.glassTypeId,
      defaultWidthMm: source.defaultWidthMm,
      defaultHeightMm: source.defaultHeightMm,
      minWidthMm: null,
      maxWidthMm: null,
      minHeightMm: null,
      maxHeightMm: null,
      sinecost: source.sinecost,
      wholesalePrice: source.wholesalePrice,
      retailPrice: source.retailPrice,
      sourceConfigurationId: source.sourceConfigurationId,
      createdById: session.user.id,
      updatedById: session.user.id,
    },
  });

  revalidateCatalog();
  return {
    ok: true,
    message: "Modelul a fost duplicat (fără istoric oferte / publicare).",
    id: copy.id,
    code: copy.code,
    slug: copy.slug,
  };
}

export async function archiveMirrorModelAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageCatalog(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a arhiva modele." };
  }

  const parsed = archiveMirrorModelSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Cerere invalidă." };
  }

  const model = await prisma.mirrorModel.findUnique({
    where: { id: parsed.data.id },
    include: { _count: { select: { offers: true } } },
  });
  if (!model) {
    return { ok: false, message: "Modelul nu a fost găsit." };
  }

  // Soft-archive only — never hard-delete (preserves commercial history / offer links).
  if (parsed.data.archive) {
    await prisma.mirrorModel.update({
      where: { id: model.id },
      data: {
        status: "ARCHIVED",
        isPublished: false,
        updatedById: session.user.id,
      },
    });
    revalidateCatalog();
    return {
      ok: true,
      message:
        model._count.offers > 0
          ? "Model arhivat (ofertele existente rămân intacte)."
          : "Model arhivat.",
      id: model.id,
    };
  }

  // Reactivate → DRAFT; ADMIN must explicitly set ACTIVE after verifying calc.
  await prisma.mirrorModel.update({
    where: { id: model.id },
    data: {
      status: "DRAFT",
      updatedById: session.user.id,
    },
  });
  revalidateCatalog();
  return {
    ok: true,
    message: "Model reactivat ca ciornă. Setați Activ după verificarea calculului.",
    id: model.id,
  };
}

/** Manager/Admin: load a model into the professional configurator (read). */
export async function assertCanOpenModelInConfigurator(
  modelId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const session = await requireStaffSession();
  if (!canViewCatalog(session.user.role)) {
    return { ok: false, message: "Acces interzis." };
  }
  const model = await prisma.mirrorModel.findUnique({ where: { id: modelId } });
  if (!model) {
    return { ok: false, message: "Modelul nu a fost găsit." };
  }
  return { ok: true };
}
