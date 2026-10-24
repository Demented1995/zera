import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { OrderManage } from "@/components/orders/order-manage";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import { mediaPath } from "@/modules/catalog/images/service";
import { canManageOrders } from "@/modules/orders/permissions";
import { getOrder, readOrderSummary } from "@/modules/orders/queries";
import { formatMdl, ORDER_STATUS_LABEL, orderBalance } from "@/modules/orders/public";

export const metadata = {
  title: "Comandă",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ComandaPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    redirect("/admin");
  }
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    notFound();
  }

  const summary = readOrderSummary(order.summaryJson);
  const retail = Number(order.retailPrice);
  const advance = Number(order.advanceAmount);
  const balance = orderBalance(retail, advance);

  return (
    <div className="space-y-8">
      <PageHeader
        title={order.number}
        description="Prețul și configurația sunt cele salvate la plasare. Nu se recalculează."
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline">{ORDER_STATUS_LABEL[order.status]}</Badge>
        <span className="text-muted-foreground">
          {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(
            order.placedAt,
          )}
        </span>
        <Link href="/admin/comenzi" className="underline-offset-2 hover:underline">
          Înapoi la comenzi
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">Client</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
          {order.customer ? (
            <p>
              Registru:{" "}
              <Link
                href={`/admin/clienti/${order.customer.id}`}
                className="underline-offset-2 hover:underline"
              >
                {order.customer.code} · {order.customer.displayName}
              </Link>
            </p>
          ) : (
            <p className="text-muted-foreground">Comanda nu este asociată unei fișe de client.</p>
          )}
        </div>
        <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">{order.lines.length > 0 ? "Total" : "Produs"}</h2>
          {order.lines.length === 0 ? (
            <p>
              {order.modelName} · {order.modelCode}
            </p>
          ) : (
            <p>
              {order.lines.length} {order.lines.length === 1 ? "produs" : "produse"}
            </p>
          )}
          <p>
            {order.lines.length > 0 ? "Total" : "Preț"}: {formatMdl(retail)}
          </p>
          <p>Avans: {formatMdl(advance)}</p>
          <p>Sold: {formatMdl(balance)}</p>
        </div>
      </section>

      {order.lines.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-lg font-medium tracking-tight">Produse</h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {order.lines.map((line) => {
              const lineSummary = readOrderSummary(line.summaryJson);
              const imageSrc =
                line.mirrorModelId && line.imageId
                  ? mediaPath(line.mirrorModelId, line.imageId, "thumb")
                  : null;
              return (
                <li key={line.id} className="grid gap-4 p-4 text-sm sm:grid-cols-[4rem_minmax(0,1fr)]">
                  {imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageSrc} alt="" className="h-16 w-16 rounded-md object-cover" />
                  ) : (
                    <div className="h-16 w-16 rounded-md bg-muted" />
                  )}
                  <div className="min-w-0 space-y-2">
                    <p className="font-medium">
                      {line.modelName} · {line.modelCode}
                    </p>
                    {lineSummary ? (
                      <p className="text-muted-foreground">
                        {lineSummary.shapeLabel} · {lineSummary.widthMm} × {lineSummary.heightMm} mm ·{" "}
                        {lineSummary.glassTypeLabel} · {lineSummary.lightingLabel}
                        {lineSummary.features.length > 0 ? ` · ${lineSummary.features.join(" · ")}` : ""}
                      </p>
                    ) : null}
                    <p>
                      {line.quantity} × {formatMdl(Number(line.unitPrice))} ={" "}
                      {formatMdl(Number(line.lineTotal))}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Configurație</h2>
        {summary ? (
          <dl className="max-w-3xl divide-y divide-border border-y border-border text-sm">
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">Formă</dt>
              <dd>{summary.shapeLabel}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">Dimensiuni</dt>
              <dd>
                {summary.widthMm} × {summary.heightMm} mm
              </dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">Sticlă</dt>
              <dd>{summary.glassTypeLabel}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
              <dt className="text-muted-foreground">Iluminare</dt>
              <dd>{summary.lightingLabel}</dd>
            </div>
            {summary.features.map((feature) => (
              <div key={feature} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr]">
                <dt className="text-muted-foreground">Opțiune</dt>
                <dd>{feature}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">Configurația salvată nu poate fi afișată.</p>
        )}
      </section>
      )}

      <OrderManage
        orderId={order.id}
        status={order.status}
        advanceAmount={advance}
        linked={order.customer != null}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Istoric status</h2>
        <ul className="divide-y divide-border rounded-xl border border-border text-sm">
          {order.statusEvents.map((event) => (
            <li key={event.id} className="space-y-1 px-4 py-3">
              <p>
                {event.fromStatus ? ORDER_STATUS_LABEL[event.fromStatus] : "—"} →{" "}
                {ORDER_STATUS_LABEL[event.toStatus]}
              </p>
              <p className="text-muted-foreground">
                {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(
                  event.createdAt,
                )}
                {event.note ? ` · ${event.note}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
