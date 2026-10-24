import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import {
  ArchiveCustomerButton,
  AssociateOfferForm,
  OfferLinkButton,
} from "@/components/customers/customer-actions";
import { CustomerForm } from "@/components/customers/customer-form";
import type { CustomerFormValues } from "@/modules/customers/form-values";
import { Badge } from "@/components/ui/badge";
import { requireStaffSession } from "@/lib/auth/guards";
import { findCustomerDuplicates } from "@/modules/customers/service";
import { canManageCustomers } from "@/modules/customers/permissions";
import {
  findUnlinkedOfferMatches,
  getCustomer,
  listCustomerOffers,
} from "@/modules/customers/queries";
import { OFFER_STATUS_LABEL } from "@/modules/offers/status";
import { listOrdersForCustomer } from "@/modules/orders/queries";
import { formatMdl, ORDER_STATUS_LABEL } from "@/modules/orders/public";

export const metadata = {
  title: "Fișă client",
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CustomerFilePage({ params }: PageProps) {
  const session = await requireStaffSession();
  if (!canManageCustomers(session.user.role)) {
    redirect("/admin");
  }
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) {
    notFound();
  }

  const [duplicates, offers, matches, orders] = await Promise.all([
    findCustomerDuplicates(customer, customer.id),
    listCustomerOffers(customer.id),
    findUnlinkedOfferMatches({
      phoneKey: customer.phoneKey,
      emailKey: customer.emailKey,
    }),
    listOrdersForCustomer(customer.id),
  ]);

  const initial: CustomerFormValues = {
    id: customer.id,
    kind: customer.kind,
    displayName: customer.displayName,
    phone: customer.phone,
    email: customer.email ?? "",
    companyName: customer.companyName ?? "",
    idno: customer.idno ?? "",
    contactName: customer.contactName ?? "",
    notes: customer.notes ?? "",
    addresses: customer.addresses.map((address) => ({
      label: address.label ?? "",
      line: address.line,
      city: address.city ?? "",
      postalCode: address.postalCode ?? "",
      isPrimary: address.isPrimary,
    })),
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={customer.displayName}
        description={`${customer.code} · fișa poate fi editată de ADMIN și MANAGER. Comenzile se asociază manual.`}
        actions={
          <ArchiveCustomerButton id={customer.id} archived={customer.status === "ARCHIVED"} />
        }
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="outline">{customer.kind === "COMPANY" ? "Persoană juridică" : "Persoană fizică"}</Badge>
        <Badge variant="outline">{customer.status === "ARCHIVED" ? "Arhivat" : "Activ"}</Badge>
        <Link href="/admin/clienti" className="underline-offset-2 hover:underline">
          Înapoi la clienți
        </Link>
      </div>

      {duplicates.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <p className="font-medium">Posibile duplicate</p>
          <ul className="space-y-1">
            {duplicates.map((match) => (
              <li key={match.id}>
                <Link href={`/admin/clienti/${match.id}`} className="underline-offset-2 hover:underline">
                  {match.code} · {match.displayName}
                </Link>
                <span className="text-muted-foreground"> — {match.reasons.join(", ")}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Înregistrarea a fost păstrată. Verifică fișele înainte de a le folosi împreună.
          </p>
        </section>
      ) : null}

      <CustomerForm initial={initial} />

      <section className="space-y-3">
        <h2 className="text-lg font-medium tracking-tight">Comenzi asociate</h2>
        {orders.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio comandă asociată.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border text-sm">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <Link href={`/admin/comenzi/${order.id}`} className="underline-offset-2 hover:underline">
                  {order.number}
                </Link>
                <span>{formatMdl(Number(order.retailPrice))}</span>
                <Badge variant="outline">{ORDER_STATUS_LABEL[order.status]}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium tracking-tight">Oferte</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Asocierea leagă oferta de această fișă. Numele și telefonul rămân cele salvate pe ofertă.
        </p>
        <AssociateOfferForm customerId={customer.id} />
        {offers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio ofertă asociată.</p>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {offers.map((offer) => (
              <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div>
                  <Link href={`/admin/oferte/${offer.id}`} className="font-medium underline-offset-2 hover:underline">
                    {offer.number}
                  </Link>
                  <p className="text-muted-foreground">
                    {offer.clientName} · {offer.clientPhone} · {offer.productName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{OFFER_STATUS_LABEL[offer.status]}</Badge>
                  <OfferLinkButton customerId={customer.id} offerId={offer.id} linked />
                </div>
              </li>
            ))}
          </ul>
        )}
        {matches.length > 0 ? (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Oferte cu același telefon sau email, încă neasociate</h3>
            <ul className="divide-y divide-border rounded-xl border border-border">
              {matches.map((offer) => (
                <li key={offer.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <Link href={`/admin/oferte/${offer.id}`} className="underline-offset-2 hover:underline">
                      {offer.number}
                    </Link>
                    <p className="text-muted-foreground">
                      {offer.clientName} · {offer.clientPhone}
                      {offer.clientEmail ? ` · ${offer.clientEmail}` : ""}
                    </p>
                  </div>
                  <OfferLinkButton customerId={customer.id} offerId={offer.id} linked={false} />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}
