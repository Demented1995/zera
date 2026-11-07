import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { AddOrderMirror } from "@/components/orders/add-order-mirror";
import { MirrorStatusSelect } from "@/components/orders/mirror-status-select";
import { DeleteOrderButton } from "@/components/orders/delete-order-button";
import { OrderManage } from "@/components/orders/order-manage";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import { canManageOrders } from "@/modules/orders/permissions";
import { getOrder, listOrderModelChoices, readOrderSummary } from "@/modules/orders/queries";
import {
  formatMdl,
  mirrorCode,
  ONE_CLICK_ADDRESS,
  ORDER_STATUS_LABEL,
  orderBalance,
} from "@/modules/orders/public";

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
  if (!order.placedById) {
    redirect(`/admin/oferte/solicitari/${order.id}`);
  }

  const summary = readOrderSummary(order.summaryJson);
  const models = await listOrderModelChoices();
  const mirrors =
    order.lines.length > 0
      ? order.lines.map((line, index) => ({
          key: line.id,
          extension: mirrorCode(order.number, index + 1),
          name: line.modelName,
          code: line.modelCode,
          summary: readOrderSummary(line.summaryJson),
          quantity: line.quantity,
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
          mirrorStatus: line.mirrorStatus,
        }))
      : [
          {
            key: "principal",
            extension: mirrorCode(order.number, 1),
            name: order.modelName,
            code: order.modelCode,
            summary,
            quantity: order.quantity,
            unitPrice: Number(order.retailPrice),
            lineTotal: Number(order.retailPrice),
            mirrorStatus: order.mirrorStatus,
          },
        ];
  const retail = Number(order.retailPrice);
  const advance = Number(order.advanceAmount);
  const balance = orderBalance(retail, advance);

  return (
    <div className="space-y-8">
      <PageHeader
        title={order.number}
        description="Numărul și clientul sunt ai comenzii. Fiecare oglindă se deschide separat."
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
        <DeleteOrderButton orderId={order.id} number={order.number} appearance="text" />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">Client</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.deliveryAddress === ONE_CLICK_ADDRESS ? (
            <p className="text-muted-foreground">Cumpărare cu un click. Adresa nu a fost cerută.</p>
          ) : (
            <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
          )}
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

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Oglinzi</h2>
        <ul className="divide-y divide-border rounded-xl border border-border">
          {mirrors.map((mirror) => (
            <li key={mirror.key} className="flex flex-wrap items-baseline justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <Link
                  href={`/admin/comenzi/${order.id}/oglinzi/${mirror.key}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  {mirror.extension}
                </Link>
                <p>{mirror.name}</p>
                <div>
                  <Link
                    href={`/admin/comenzi/${order.id}/oglinzi/${mirror.key}`}
                    className="text-sm underline-offset-2 hover:underline"
                  >
                    Editează
                  </Link>
                </div>
                <p className="text-muted-foreground">
                  {mirror.code}
                  {mirror.summary
                    ? ` · ${mirror.summary.widthMm} × ${mirror.summary.heightMm} mm · ${mirror.summary.glassTypeLabel} · ${mirror.summary.lightingLabel}`
                    : ""}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p>
                  {mirror.quantity} × {formatMdl(mirror.unitPrice)} = {formatMdl(mirror.lineTotal)}
                </p>
                <MirrorStatusSelect orderId={order.id} mirrorKey={mirror.key} status={mirror.mirrorStatus} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section id="oglinda-noua" className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="text-lg font-medium tracking-tight">Adaugă oglindă</h2>
        <AddOrderMirror orderId={order.id} models={models} />
      </section>

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
