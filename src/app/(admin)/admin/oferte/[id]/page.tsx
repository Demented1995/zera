import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { OfferActions } from "@/components/offers/offer-actions";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import { getOffer } from "@/modules/offers/queries";
import { OFFER_STATUS_LABEL } from "@/modules/offers/status";

export const metadata = {
  title: "Detalii ofertă",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

function money(value: { toString(): string } | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  return `${Number(value).toFixed(2)} MDL`;
}

export default async function OfferDetailPage({ params }: PageProps) {
  await requireStaffSession();
  const { id } = await params;
  const offer = await getOffer(id);
  if (!offer) {
    notFound();
  }

  const latest = offer.revisions[0] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Ofertă ${offer.number}`}
        description="Snapshot imutabil la emitere — modificările ulterioare de tarife nu alterează reviziile emise."
      />

      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="outline">
          {OFFER_STATUS_LABEL[offer.displayStatus]}
        </Badge>
        <OfferActions
          offerId={offer.id}
          canIssue={offer.status === "DRAFT" || offer.revisions.length === 0}
        />
        <Link
          href="/admin/oferte"
          className="text-sm text-muted-foreground underline-offset-2 hover:underline"
        >
          Înapoi la listă
        </Link>
      </div>

      <div className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <div className="space-y-1 text-sm">
          <p className="font-medium">Client</p>
          <p>{offer.clientName}</p>
          <p className="text-muted-foreground">{offer.clientPhone}</p>
          {offer.clientEmail ? (
            <p className="text-muted-foreground">{offer.clientEmail}</p>
          ) : null}
          {offer.clientCompany ? (
            <p className="text-muted-foreground">{offer.clientCompany}</p>
          ) : null}
          {offer.customer ? (
            <p>
              Fișă client:{" "}
              <Link
                href={`/admin/clienti/${offer.customer.id}`}
                className="underline-offset-2 hover:underline"
              >
                {offer.customer.code} · {offer.customer.displayName}
              </Link>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Oferta nu este asociată unei fișe de client. Datele de mai sus rămân pe ofertă.
            </p>
          )}
        </div>
        <div className="space-y-1 text-sm">
          <p className="font-medium">Produs</p>
          <p>{offer.productName}</p>
          <p className="text-muted-foreground">
            Cantitate {offer.quantity} ·{" "}
            {offer.priceTier === "wholesale" ? "En-gros" : "Retail"}
          </p>
          {offer.configuration ? (
            <p>
              Config:{" "}
              <Link
                href={`/admin/configurator?id=${offer.configuration.id}`}
                className="underline-offset-2 hover:underline"
              >
                {offer.configuration.code}
              </Link>
            </p>
          ) : null}
          <p className="text-muted-foreground">
            Valabilitate: {offer.validityDays} zile
            {offer.validUntil
              ? ` · până la ${offer.validUntil.toLocaleDateString("ro-RO")}`
              : ""}
          </p>
        </div>
      </div>

      {latest ? (
        <div className="rounded-xl border border-border bg-card p-5 text-sm">
          <p className="font-medium">
            Ultima revizie emisă: #{latest.revisionNumber}
          </p>
          <p className="mt-2">Preț unitar: {money(latest.unitPrice)}</p>
          <p>Servicii: {money(latest.servicesTotal)}</p>
          <p className="font-medium">Total: {money(latest.offerTotal)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Emisă {latest.issuedAt.toLocaleString("ro-RO")} de{" "}
            {latest.issuedBy.name ?? latest.issuedBy.email}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            PDF-ul comercial nu include sinecostul sau costurile interne.
          </p>
        </div>
      ) : (
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Ofertă ciornă — emiteți pentru a îngheța prețurile într-un snapshot
          imutabil.
        </p>
      )}

      {offer.revisions.length > 1 ? (
        <div className="rounded-xl border border-border p-5">
          <p className="mb-3 text-sm font-medium">Istoric revizii</p>
          <ul className="space-y-2 text-sm">
            {offer.revisions.map((rev) => (
              <li
                key={rev.id}
                className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 last:border-0"
              >
                <span>
                  Rev. {rev.revisionNumber} · {money(rev.offerTotal)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {rev.issuedAt.toLocaleString("ro-RO")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
