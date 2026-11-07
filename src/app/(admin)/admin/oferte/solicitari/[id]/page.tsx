import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { MarkRequestOpened } from "@/components/orders/mark-request-opened";
import { SendToProductionButton } from "@/components/orders/send-to-production";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import { mediaPath } from "@/modules/catalog/images/service";
import { canManageOrders } from "@/modules/orders/permissions";
import {
  getOrder,
  markSiteRequestOpened,
  readOrderSummary,
  readProjectMessage,
} from "@/modules/orders/queries";
import {
  CUSTOM_PROJECT_CODE,
  formatMdl,
  ONE_CLICK_ADDRESS,
  siteRequestLabel,
} from "@/modules/orders/public";

export const metadata = {
  title: "Solicitare",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function SiteRequestPage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageOrders(session.user.role)) {
    redirect("/admin");
  }
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) {
    notFound();
  }
  if (order.placedById) {
    redirect(`/admin/comenzi/${order.id}`);
  }
  await markSiteRequestOpened(order.id);

  const summary = readOrderSummary(order.summaryJson);
  const projectMessage = readProjectMessage(order.summaryJson);
  const isProject = order.modelCode === CUSTOM_PROJECT_CODE;
  const kind = siteRequestLabel({
    deliveryAddress: order.deliveryAddress,
    note: order.statusEvents.at(-1)?.note,
  });

  return (
    <div className="space-y-8">
      <MarkRequestOpened orderId={order.id} />
      <PageHeader
        title={order.number}
        description="Solicitare din site. Datele și prețul sunt cele alese de client. Trimiterea la producere o înregistrează ca comandă, fără să le schimbe."
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Badge variant="outline">{kind}</Badge>
        <span className="text-muted-foreground">
          {new Intl.DateTimeFormat("ro-RO", { dateStyle: "medium", timeStyle: "short" }).format(
            order.placedAt,
          )}
        </span>
        <Link href="/admin/oferte" className="underline-offset-2 hover:underline">
          Înapoi la oferte
        </Link>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">Client</h2>
          <p>{order.customerName}</p>
          <p>{order.customerPhone}</p>
          {order.deliveryAddress === ONE_CLICK_ADDRESS ? (
            <p className="text-muted-foreground">Cumpărare cu un click. Adresa nu a fost cerută.</p>
          ) : order.deliveryAddress.trim() ? (
            <p className="whitespace-pre-wrap">{order.deliveryAddress}</p>
          ) : (
            <p className="text-muted-foreground">Adresa nu a fost lăsată.</p>
          )}
        </div>
        <div className="space-y-3 rounded-xl border border-border p-4 text-sm">
          <h2 className="font-medium">Producere</h2>
          {isProject ? (
            <p>Fără preț. Configurația se discută la telefon.</p>
          ) : (
            <>
              <p>
                {order.lines.length > 0 ? "Total" : "Preț"}: {formatMdl(Number(order.retailPrice))}
              </p>
              <SendToProductionButton orderId={order.id} />
            </>
          )}
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
      ) : isProject ? (
        <section className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight">{order.modelName}</h2>
          {projectMessage ? (
            <p className="max-w-3xl whitespace-pre-wrap text-sm">{projectMessage}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Clientul nu a lăsat detalii despre proiect.</p>
          )}
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-lg font-medium tracking-tight">
            {order.modelName} · {order.modelCode}
          </h2>
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
    </div>
  );
}
