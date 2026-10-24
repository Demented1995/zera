"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { requireStaffSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { nextConfigurationCode, nextOfferNumber } from "@/modules/offers/codes";
import {
  getCompanySettings,
  missingCompanyFields,
} from "@/modules/offers/company";
import { buildOfferPdfBytes } from "@/modules/offers/pdf";
import {
  canEditCompanySettings,
  canManageConfigurations,
  canManageOffers,
} from "@/modules/offers/permissions";
import { recalculateFromConfigPayload } from "@/modules/offers/recalc";
import {
  companySettingsSchema,
  createOfferSchema,
  duplicateConfigurationSchema,
  issueOfferSchema,
  saveConfigurationSchema,
} from "@/modules/offers/schemas";
import { buildImmutableSnapshot } from "@/modules/offers/snapshots";
import { deriveConfigStatus } from "@/modules/offers/status";
import { getShapeById } from "@/modules/configurator/shapes";

export type ActionResult =
  | { ok: true; message: string; id?: string; code?: string; number?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }
  return new Prisma.Decimal(value);
}

export async function saveConfigurationAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageConfigurations(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a salva configurații." };
  }

  const parsed = saveConfigurationSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele configurației.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, internalNotes, config, forceDraft, id } = parsed.data;
  const { state, calculation, blockers } = await recalculateFromConfigPayload(
    config,
  );

  if (!Number.isFinite(state.widthMm) || !Number.isFinite(state.heightMm)) {
    return { ok: false, message: "Dimensiuni invalide." };
  }
  if (state.widthMm <= 0 || state.heightMm <= 0) {
    return { ok: false, message: "Dimensiunile trebuie să fie pozitive." };
  }

  const shape = getShapeById(state.shapeId);
  const status = deriveConfigStatus(calculation, Boolean(forceDraft));
  // Incomplete configs may be saved as draft / incomplete — never block save.
  const userId = session.user.id;

  const data = {
    name,
    status,
    configJson: state as unknown as Prisma.InputJsonValue,
    calculationJson: (calculation ?? {
      status: "INCOMPLETE",
      missingCosts: blockers,
    }) as unknown as Prisma.InputJsonValue,
    shapeId: state.shapeId,
    shapeLabel: shape?.label ?? state.shapeId,
    widthMm: new Prisma.Decimal(state.widthMm),
    heightMm: new Prisma.Decimal(state.heightMm),
    glassTypeId: state.glassTypeId,
    sinecost: decimalOrNull(calculation?.totalProductionCost ?? null),
    wholesalePrice: decimalOrNull(calculation?.wholesalePrice ?? null),
    retailPrice: decimalOrNull(calculation?.retailPrice ?? null),
    internalNotes: internalNotes ?? null,
    updatedById: userId,
  };

  if (id) {
    const existing = await prisma.savedConfiguration.findUnique({
      where: { id },
    });
    if (!existing) {
      return { ok: false, message: "Configurația nu a fost găsită." };
    }
    const updated = await prisma.savedConfiguration.update({
      where: { id },
      data,
    });
    revalidatePath("/admin/configuratii");
    revalidatePath("/admin/configurator");
    return {
      ok: true,
      message: "Configurația a fost actualizată.",
      id: updated.id,
      code: updated.code,
    };
  }

  const code = await nextConfigurationCode();
  const created = await prisma.savedConfiguration.create({
    data: {
      ...data,
      code,
      createdById: userId,
    },
  });
  revalidatePath("/admin/configuratii");
  revalidatePath("/admin/configurator");
  return {
    ok: true,
    message: "Configurația a fost salvată.",
    id: created.id,
    code: created.code,
  };
}

export async function duplicateConfigurationAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageConfigurations(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a duplica." };
  }

  const parsed = duplicateConfigurationSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "ID invalid." };
  }

  const source = await prisma.savedConfiguration.findUnique({
    where: { id: parsed.data.id },
  });
  if (!source) {
    return { ok: false, message: "Configurația sursă nu există." };
  }

  const code = await nextConfigurationCode();
  const userId = session.user.id;
  const created = await prisma.savedConfiguration.create({
    data: {
      code,
      name: `Copie — ${source.name}`,
      status: source.status,
      configJson: source.configJson as Prisma.InputJsonValue,
      calculationJson: source.calculationJson as Prisma.InputJsonValue,
      shapeId: source.shapeId,
      shapeLabel: source.shapeLabel,
      widthMm: source.widthMm,
      heightMm: source.heightMm,
      glassTypeId: source.glassTypeId,
      sinecost: source.sinecost,
      wholesalePrice: source.wholesalePrice,
      retailPrice: source.retailPrice,
      internalNotes: source.internalNotes,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidatePath("/admin/configuratii");
  return {
    ok: true,
    message: "Configurația a fost duplicată (fără istoricul ofertelor).",
    id: created.id,
    code: created.code,
  };
}

export async function createOfferAction(raw: unknown): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageOffers(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a crea oferte." };
  }

  const parsed = createOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele ofertei / clientului.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;
  let draftConfig: Record<string, unknown> | null = data.config ?? null;
  let draftCalculation: unknown = null;

  if (data.configurationId) {
    const cfg = await prisma.savedConfiguration.findUnique({
      where: { id: data.configurationId },
    });
    if (!cfg) {
      return { ok: false, message: "Configurația asociată nu există." };
    }
    draftConfig = cfg.configJson as Record<string, unknown>;
    draftCalculation = cfg.calculationJson;
  } else if (draftConfig) {
    const recalc = await recalculateFromConfigPayload(draftConfig);
    draftCalculation = recalc.calculation;
  } else {
    return {
      ok: false,
      message: "Selectați o configurație salvată sau trimiteți config din configurator.",
    };
  }

  const number = await nextOfferNumber();
  const userId = session.user.id;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + data.validityDays);

  const created = await prisma.customerOffer.create({
    data: {
      number,
      status: "DRAFT",
      configurationId: data.configurationId ?? null,
      clientName: data.clientName,
      clientPhone: data.clientPhone,
      clientEmail: data.clientEmail ?? null,
      clientCompany: data.clientCompany ?? null,
      clientNotes: data.clientNotes ?? null,
      productName: data.productName,
      quantity: data.quantity,
      priceTier: data.priceTier,
      validityDays: data.validityDays,
      validUntil,
      commercialNotes: data.commercialNotes ?? null,
      draftConfigJson: draftConfig as Prisma.InputJsonValue,
      draftCalculationJson: draftCalculation as Prisma.InputJsonValue,
      createdById: userId,
      updatedById: userId,
    },
  });

  revalidatePath("/admin/oferte");
  return {
    ok: true,
    message: "Oferta ciornă a fost creată.",
    id: created.id,
    number: created.number,
  };
}

export async function issueOfferAction(raw: unknown): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canManageOffers(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a emite oferte." };
  }

  const parsed = issueOfferSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: "Verificați datele ofertei.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const offer = await prisma.customerOffer.findUnique({
    where: { id: parsed.data.offerId },
    include: { revisions: { orderBy: { revisionNumber: "desc" }, take: 1 } },
  });
  if (!offer) {
    return { ok: false, message: "Oferta nu a fost găsită." };
  }

  const company = await getCompanySettings();
  const companyMissing = missingCompanyFields(company);
  if (companyMissing.length > 0) {
    return {
      ok: false,
      message: `Date firmă incomplete în Setări: ${companyMissing.join(", ")}. Completați-le înainte de emitere.`,
    };
  }

  const clientName = parsed.data.clientName ?? offer.clientName;
  const clientPhone = parsed.data.clientPhone ?? offer.clientPhone;
  if (!clientName.trim() || !clientPhone.trim()) {
    return { ok: false, message: "Numele și telefonul clientului sunt obligatorii." };
  }

  const configPayload =
    (parsed.data.config as Record<string, unknown> | undefined) ??
    (offer.draftConfigJson as Record<string, unknown> | null);
  if (!configPayload) {
    return { ok: false, message: "Configurația tehnică lipsește din ofertă." };
  }

  const { state, calculation, blockers } =
    await recalculateFromConfigPayload(configPayload);

  if (!calculation || calculation.status !== "COMPLETE") {
    return {
      ok: false,
      message: `Nu se poate emite: calcul incomplet. ${[...blockers, ...(calculation?.missingCosts ?? [])].slice(0, 5).join("; ")}`,
    };
  }
  if (state.widthMm <= 0 || state.heightMm <= 0) {
    return { ok: false, message: "Dimensiuni invalide — emiterea este blocată." };
  }

  const priceTier = (parsed.data.priceTier ?? offer.priceTier) as
    | "wholesale"
    | "retail";
  const unitPrice =
    priceTier === "wholesale"
      ? calculation.wholesalePrice
      : calculation.retailPrice;
  if (unitPrice === null || !Number.isFinite(unitPrice)) {
    return {
      ok: false,
      message: "Nu există un preț comercial valid (en-gros/retail) pentru emitere.",
    };
  }

  const quantity = parsed.data.quantity ?? offer.quantity;
  const servicesTotal =
    calculation.financial?.services.total ?? calculation.serviceCosts ?? 0;
  if (servicesTotal === null) {
    return {
      ok: false,
      message: "Serviciile comerciale au costuri incomplete — emiterea este blocată.",
    };
  }

  const offerTotal =
    Math.round((unitPrice * quantity + servicesTotal) * 100) / 100;
  const validityDays = parsed.data.validityDays ?? offer.validityDays;
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + validityDays);

  // Always append a new immutable revision — never overwrite prior commercial history.
  const previousRevision = offer.revisions[0]?.revisionNumber ?? 0;
  const nextRevision = previousRevision + 1;

  const snapshot = buildImmutableSnapshot({
    offerNumber: offer.number,
    revisionNumber: nextRevision,
    state,
    calculation,
    client: {
      name: clientName,
      phone: clientPhone,
      email: parsed.data.clientEmail ?? offer.clientEmail,
      company: parsed.data.clientCompany ?? offer.clientCompany,
      notes: parsed.data.clientNotes ?? offer.clientNotes,
    },
    productName: parsed.data.productName ?? offer.productName,
    quantity,
    priceTier,
    unitPrice,
    servicesTotal,
    offerTotal,
    validityDays,
    validUntil,
    commercialNotes: parsed.data.commercialNotes ?? offer.commercialNotes,
    company: {
      legalName: company.legalName,
      taxId: company.taxId,
      address: company.address,
      phone: company.phone,
      email: company.email,
      bankDetails: company.bankDetails,
    },
  });

  const userId = session.user.id;

  await prisma.$transaction(async (tx) => {
    await tx.offerRevision.create({
      data: {
        offerId: offer.id,
        revisionNumber: nextRevision,
        snapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        unitPrice: new Prisma.Decimal(unitPrice),
        servicesTotal: new Prisma.Decimal(servicesTotal),
        offerTotal: new Prisma.Decimal(offerTotal),
        priceTier,
        configJson: state as unknown as Prisma.InputJsonValue,
        calculationPublicJson: snapshot.publicCalculation as unknown as Prisma.InputJsonValue,
        issuedById: userId,
      },
    });

    await tx.customerOffer.update({
      where: { id: offer.id },
      data: {
        status: "ISSUED",
        clientName,
        clientPhone,
        clientEmail: parsed.data.clientEmail ?? offer.clientEmail,
        clientCompany: parsed.data.clientCompany ?? offer.clientCompany,
        clientNotes: parsed.data.clientNotes ?? offer.clientNotes,
        productName: parsed.data.productName ?? offer.productName,
        quantity,
        priceTier,
        validityDays,
        validUntil,
        commercialNotes: parsed.data.commercialNotes ?? offer.commercialNotes,
        draftConfigJson: state as unknown as Prisma.InputJsonValue,
        draftCalculationJson: calculation as unknown as Prisma.InputJsonValue,
        issuedAt: offer.issuedAt ?? new Date(),
        updatedById: userId,
      },
    });
  });

  revalidatePath("/admin/oferte");
  revalidatePath(`/admin/oferte/${offer.id}`);
  return {
    ok: true,
    message: `Oferta a fost emisă (revizia ${nextRevision}). Prețurile sunt înghețate în snapshot.`,
    id: offer.id,
    number: offer.number,
  };
}

export async function downloadOfferPdfAction(
  offerId: string,
  revisionNumber?: number,
): Promise<
  | { ok: true; filename: string; base64: string }
  | { ok: false; message: string }
> {
  const session = await requireStaffSession();
  if (!canManageOffers(session.user.role)) {
    return { ok: false, message: "Nu aveți permisiunea de a descărca PDF." };
  }

  const offer = await prisma.customerOffer.findUnique({
    where: { id: offerId },
    include: {
      revisions: { orderBy: { revisionNumber: "desc" } },
    },
  });
  if (!offer) {
    return { ok: false, message: "Oferta nu există." };
  }
  if (offer.revisions.length === 0) {
    return {
      ok: false,
      message: "Oferta nu are o revizie emisă — emiteți oferta înainte de PDF.",
    };
  }

  const revision =
    revisionNumber != null
      ? offer.revisions.find((item) => item.revisionNumber === revisionNumber)
      : offer.revisions[0];
  if (!revision) {
    return { ok: false, message: "Revizia solicitată nu există." };
  }

  const snapshot = revision.snapshotJson as unknown as Parameters<
    typeof buildOfferPdfBytes
  >[0];
  const bytes = await buildOfferPdfBytes(snapshot);
  const base64 = Buffer.from(bytes).toString("base64");
  return {
    ok: true,
    filename: `${offer.number}-r${revision.revisionNumber}.pdf`,
    base64,
  };
}

export async function updateCompanySettingsAction(
  raw: unknown,
): Promise<ActionResult> {
  const session = await requireStaffSession();
  if (!canEditCompanySettings(session.user.role)) {
    return {
      ok: false,
      message: "Doar ADMIN poate modifica datele legale ale firmei.",
    };
  }

  const parsed = companySettingsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Verificați câmpurile firmei." };
  }

  await prisma.companySettings.upsert({
    where: { id: "default" },
    create: { id: "default", ...parsed.data },
    update: { ...parsed.data },
  });
  revalidatePath("/admin/setari");
  return { ok: true, message: "Datele firmei au fost salvate." };
}

export async function markExpiredOffersAction(): Promise<ActionResult> {
  await requireStaffSession();
  const now = new Date();
  const result = await prisma.customerOffer.updateMany({
    where: {
      status: { in: ["ISSUED", "ACCEPTED"] },
      validUntil: { lt: now },
    },
    data: { status: "EXPIRED" },
  });
  revalidatePath("/admin/oferte");
  return {
    ok: true,
    message: `${result.count} oferte marcate Expirată (fără ștergerea reviziilor).`,
  };
}
