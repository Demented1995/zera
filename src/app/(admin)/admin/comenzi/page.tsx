import Link from "next/link";
import { Pencil } from "lucide-react";
import { redirect } from "next/navigation";
import type { MirrorStatus, OrderStatus } from "@prisma/client";

import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { MirrorConclusion } from "@/components/orders/mirror-conclusion";
import { MirrorStatusSelect } from "@/components/orders/mirror-status-select";
import { OrderFilters } from "@/components/orders/order-filters";
import { OrderMirrorsWindow } from "@/components/orders/order-mirrors-window";
import { OrderStatusSelect } from "@/components/orders/order-status-select";
import { mediaPath } from "@/modules/catalog/images/service";
import { getConfiguratorLayout } from "@/modules/configurator/layout-store";
import { professionalConclusionRows } from "@/modules/orders/conclusion";
import { readMirrorPlacement } from "@/modules/orders/placement";
import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import { listOrders, readOrderSummary } from "@/modules/orders/queries";
import {
  formatMdl,
  mirrorCode,
  MIRROR_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  orderBoardComment,
  orderBoardMethod,
} from "@/modules/orders/public";

export const metadata = {
  title: "Comenzi",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    oglinda?: string;
    page?: string;
  }>;
};

function asStatus(value: string | undefined): OrderStatus | "ALL" {
  if (value && value in ORDER_STATUS_LABEL) {
    return value as OrderStatus;
  }
  return "ALL";
}

function asMirror(value: string | undefined): MirrorStatus | "ALL" {
  if (value && value in MIRROR_STATUS_LABEL) {
    return value as MirrorStatus;
  }
  return "ALL";
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Chisinau",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function dayLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Chisinau",
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("day")}-${pick("month")}-${pick("year")}`;
}

function sizeLabel(value: number): string {
  return Number.isFinite(value) && value > 0 ? String(Math.round(value)) : "—";
}

function photoUrl(
  modelId: string | null,
  imageId: string | null,
  fallbackImageId: string | null,
): string | null {
  const id = imageId ?? fallbackImageId;
  if (!modelId || !id) {
    return null;
  }
  return mediaPath(modelId, id, "display");
}

type ListedModel = {
  category: { name: string } | null;
  images: Array<{ id: string }>;
} | null;

function mirrorsOf(
  row: {
    id: string;
    number: string;
    modelName: string;
    mirrorModelId: string | null;
    summaryJson: unknown;
    placementJson: unknown;
    mirrorStatus: MirrorStatus;
    retailPrice: { toString(): string } | number;
    mirrorModel: ListedModel;
    lines: Array<{
      id: string;
      modelName: string;
      mirrorModelId: string | null;
      imageId: string | null;
      summaryJson: unknown;
      placementJson: unknown;
      lineTotal: { toString(): string } | number;
      mirrorStatus: MirrorStatus;
      mirrorModel: ListedModel;
    }>;
  },
  layout: Awaited<ReturnType<typeof getConfiguratorLayout>>,
) {
  const source =
    row.lines.length > 0
      ? row.lines.map((line) => ({
          key: line.id,
          name: line.modelName,
          photoUrl: photoUrl(
            line.mirrorModelId,
            line.imageId,
            line.mirrorModel?.images[0]?.id ?? null,
          ),
          summary: readOrderSummary(line.summaryJson),
          placement: readMirrorPlacement(line.placementJson),
          price: Number(line.lineTotal),
          status: line.mirrorStatus,
        }))
      : [
          {
            key: "principal",
            name: row.modelName,
            photoUrl: photoUrl(row.mirrorModelId, null, row.mirrorModel?.images[0]?.id ?? null),
            summary: readOrderSummary(row.summaryJson),
            placement: readMirrorPlacement(row.placementJson),
            price: Number(row.retailPrice),
            status: row.mirrorStatus,
          },
        ];
  return source.map((item, index) => ({
    key: item.key,
    code: mirrorCode(row.number, index + 1),
    name: item.name,
    photoUrl: item.photoUrl,
    rows: professionalConclusionRows(item.summary, layout),
    placement: item.placement,
    glass: item.summary?.glassTypeLabel ?? "—",
    height: item.summary?.heightMm ?? Number.NaN,
    width: item.summary?.widthMm ?? Number.NaN,
    features: item.summary?.features ?? [],
    known: item.summary != null,
    price: item.price,
    status: item.status,
    href: `/admin/comenzi/${row.id}/oglinzi/${item.key}`,
  }));
}

export default async function ComenziPage({ searchParams }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    redirect("/admin");
  }
  const params = searchParams ? await searchParams : {};
  const status = asStatus(params.status);
  const mirror = asMirror(params.oglinda);
  const page = Number(params.page);
  const layout = await getConfiguratorLayout();
  const result = await listOrders({
    q: params.q ?? "",
    status,
    mirror,
    page: Number.isFinite(page) ? page : 1,
  });

  const groups: Array<{ key: string; label: string; rows: typeof result.rows }> = [];
  for (const row of result.rows) {
    const key = dayKey(row.placedAt);
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) {
      groups.push({ key, label: dayLabel(row.placedAt), rows: [row] });
    } else {
      last.rows.push(row);
    }
  }

  function hrefFor(nextPage: number) {
    const search = new URLSearchParams();
    if (params.q?.trim()) {
      search.set("q", params.q.trim());
    }
    if (status !== "ALL") {
      search.set("status", status);
    }
    if (mirror !== "ALL") {
      search.set("oglinda", mirror);
    }
    search.set("page", String(nextPage));
    return `/admin/comenzi?${search.toString()}`;
  }

  return (
    <div className="overflow-hidden rounded-md border border-[#d7dbe2] bg-white">
      <div className="bg-[#3e5163] px-4 py-3 text-sm font-semibold tracking-wide text-white uppercase">
        Comenzi ({result.total})
      </div>
      <OrderFilters q={params.q ?? ""} status={status} mirror={mirror} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] border-collapse text-left text-xs">
          <thead className="bg-[#f7f8fa] text-[11px] tracking-wide text-[#6b7280] uppercase">
            <tr>
              <th className="px-3 py-2 font-medium">Data</th>
              <th className="px-2 py-2 font-medium">#</th>
              <th className="px-2 py-2 font-medium">Status</th>
              <th className="px-2 py-2 font-medium">Client</th>
              <th className="px-2 py-2 font-medium">Oglindă</th>
              <th className="px-2 py-2 font-medium">Înălțime</th>
              <th className="px-2 py-2 font-medium">Lățime</th>
              <th className="px-2 py-2 font-medium">Statut</th>
              <th className="px-2 py-2 font-medium">Metodă</th>
              <th className="px-2 py-2 font-medium">Comentariu</th>
              <th className="px-2 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {result.rows.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-sm text-[#6b7280]">
                  Nicio comandă pentru filtrele alese.
                </td>
              </tr>
            ) : (
              groups.flatMap((group) => {
                const dateSpan = group.rows.reduce((sum, row) => sum + mirrorsOf(row, layout).length, 0);
                let dateShown = false;
                return group.rows.flatMap((row) => {
                  const mirrors = mirrorsOf(row, layout);
                  const method = mirrors.some((mirror) => mirror.known)
                    ? orderBoardMethod(mirrors.flatMap((mirror) => mirror.features))
                    : "—";
                  return mirrors.map((mirror, index) => {
                    const showDate = !dateShown;
                    if (showDate) {
                      dateShown = true;
                    }
                    return (
                      <tr key={`${row.id}-${mirror.key}`}>
                        {showDate ? (
                          <td
                            rowSpan={dateSpan}
                            className="bg-white px-3 py-2 align-top text-[11px] whitespace-nowrap text-[#6b7280]"
                          >
                            {group.label}
                          </td>
                        ) : null}
                        {index === 0 ? (
                          <td rowSpan={mirrors.length} className="bg-[#6d4bd4] px-2 py-2 align-top whitespace-nowrap text-white">
                            <OrderMirrorsWindow
                              orderId={row.id}
                              number={row.number}
                              customerName={row.customerName}
                              mirrors={mirrors.map((mirror) => ({
                                key: mirror.key,
                                code: mirror.code,
                                name: mirror.name,
                                detail: `${sizeLabel(mirror.width)} × ${sizeLabel(mirror.height)} mm · ${MIRROR_STATUS_LABEL[mirror.status]}`,
                                price: formatMdl(mirror.price),
                                href: mirror.href,
                              }))}
                            />
                          </td>
                        ) : null}
                        {index === 0 ? (
                          <td rowSpan={mirrors.length} className="bg-[#6d4bd4] px-2 py-2 align-top">
                            <OrderStatusSelect orderId={row.id} status={row.status} />
                          </td>
                        ) : null}
                        {index === 0 ? (
                          <td rowSpan={mirrors.length} className="bg-[#6d4bd4] px-2 py-2 align-top text-white">
                            <div>{row.customerName}</div>
                            <div className="text-[10px] text-white/80">{row.customerPhone}</div>
                            <Link
                              href={`/admin/comenzi/${row.id}#oglinda-noua`}
                              className="text-[10px] text-white/80 underline-offset-2 hover:underline"
                            >
                              Adaugă oglindă
                            </Link>
                          </td>
                        ) : null}
                        <td className="border-t-2 border-l-4 border-[#f4b000] bg-[#f4f0ff] px-2 py-2 pl-3 text-[#31245f]">
                          <div className="flex items-start gap-2">
                            <MirrorConclusion
                              data={{
                                orderId: row.id,
                                mirrorKey: mirror.key,
                                code: mirror.code,
                                name: mirror.name,
                                photoUrl: mirror.photoUrl,
                                rows: mirror.rows,
                                placement: mirror.placement,
                                width: mirror.known ? `${sizeLabel(mirror.width)} mm` : "—",
                                height: mirror.known ? `${sizeLabel(mirror.height)} mm` : "—",
                                glass: mirror.glass,
                              }}
                            />
                            <div>
                              <Link href={mirror.href} className="underline-offset-2 hover:underline">
                                <div className="font-medium">{mirror.code}</div>
                                <div>{mirror.name}</div>
                              </Link>
                              <div className="text-[10px] text-[#6d5cae]">{formatMdl(mirror.price)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="border-t-2 border-[#f4b000] bg-[#f4f0ff] px-2 py-2 text-[#31245f]">
                          {sizeLabel(mirror.height)}
                        </td>
                        <td className="border-t-2 border-[#f4b000] bg-[#f4f0ff] px-2 py-2 text-[#31245f]">
                          {sizeLabel(mirror.width)}
                        </td>
                        <td className="border-t-2 border-[#f4b000] bg-[#f4f0ff] px-2 py-2">
                          <MirrorStatusSelect orderId={row.id} mirrorKey={mirror.key} status={mirror.status} />
                        </td>
                        {index === 0 ? (
                          <td rowSpan={mirrors.length} className="bg-[#6d4bd4] px-2 py-2 align-top whitespace-nowrap text-white">
                            {method}
                          </td>
                        ) : null}
                        {index === 0 ? (
                          <td rowSpan={mirrors.length} className="max-w-48 bg-[#6d4bd4] px-2 py-2 align-top text-white/90">
                            {orderBoardComment(row.statusEvents.map((event) => event.note))}
                          </td>
                        ) : null}
                        <td className="border-t-2 border-[#f4b000] bg-[#f4f0ff] px-2 py-2">
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/admin/comenzi/${row.id}/oglinzi/${mirror.key}`}
                              aria-label={`Editează ${mirror.name}`}
                              className="inline-flex size-6 items-center justify-center rounded bg-[#f4b000] text-[#3b2a00]"
                            >
                              <Pencil className="size-3.5" />
                            </Link>
                            {index === 0 ? (
                              <DeleteOrderButton orderId={row.id} number={row.number} appearance="icon" />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  });
                });
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e7eb] px-3 py-2 text-xs text-[#6b7280]">
        <p>
          {result.total} {result.total === 1 ? "comandă" : "comenzi"} · pagina {result.page} din{" "}
          {result.pages}
        </p>
        <div className="flex gap-3">
          {result.page > 1 ? (
            <Link href={hrefFor(result.page - 1)} className="underline-offset-2 hover:underline">
              Pagina anterioară
            </Link>
          ) : null}
          {result.page < result.pages ? (
            <Link href={hrefFor(result.page + 1)} className="underline-offset-2 hover:underline">
              Pagina următoare
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
