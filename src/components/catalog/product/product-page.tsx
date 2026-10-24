"use client";

import Link from "next/link";

import { ConfiguratorFields } from "@/components/catalog/configurator-fields";
import { OrderForm } from "@/components/catalog/product/order-form";
import { ProductGallery } from "@/components/catalog/product/product-gallery";
import { RichContent } from "@/components/catalog/product/rich-content";
import { Button } from "@/components/ui/button";
import { isEmptyDocument } from "@/modules/catalog/content/document";
import { productStatusNote } from "@/modules/catalog/preview/product-presentation";
import type { CustomerPreviewPayload, PreviewPatch } from "@/modules/catalog/preview/types";
import { formatMdl, type PlaceOrderInput, type PlaceOrderResult } from "@/modules/orders/public";

type Props = {
  customer: CustomerPreviewPayload;
  pending: boolean;
  revision: number;
  onPatch: (patch: PreviewPatch) => void;
  onPlaceOrder?: (input: PlaceOrderInput) => Promise<PlaceOrderResult>;
  onAddToCart?: () => void;
  cartNote?: string | null;
  orderContextNote?: string;
};

export function ProductPage({
  customer,
  pending,
  revision,
  onPatch,
  onPlaceOrder,
  onAddToCart,
  cartNote,
  orderContextNote,
}: Props) {
  const copy = customer.productCopy;
  const statusNote = productStatusNote(customer.model.status);
  const priceReady = customer.price.available && customer.price.retailPrice != null;
  const orderEnabled =
    customer.model.status !== "ARCHIVED" &&
    priceReady &&
    !pending &&
    customer.notices.length === 0;

  const specs = [
    ...(copy?.specs ?? []).map((spec) => ({ id: spec.label, ...spec })),
    ...(copy?.extraSpecs ?? []),
  ];
  const showDescription = copy ? !isEmptyDocument(copy.description) : false;
  const showHighlights = copy ? !isEmptyDocument(copy.highlightsDocument) : false;
  const showCare = copy ? !isEmptyDocument(copy.careDocument) : false;
  const showWarranty = copy ? !isEmptyDocument(copy.warrantyDocument) : false;
  const showDelivery = copy ? !isEmptyDocument(copy.deliveryDocument) : false;

  return (
    <article className="overflow-x-clip bg-background text-foreground">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={customer.gallery} />
        <div className="min-w-0 space-y-8">
          <header className="space-y-4">
            <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">ZERA</p>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              {customer.model.name}
            </h1>
            {customer.model.shortDescription ? (
              <p className="max-w-xl text-base leading-7 text-muted-foreground">
                {customer.model.shortDescription}
              </p>
            ) : null}
            {statusNote ? (
              <p className="text-sm text-muted-foreground">{statusNote}</p>
            ) : null}
          </header>

          <div aria-live="polite" aria-busy={pending} className="space-y-2">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Preț</p>
            <p className={`text-3xl font-semibold tracking-tight ${pending ? "opacity-60" : ""}`}>
              {priceReady && customer.price.retailPrice != null
                ? formatMdl(customer.price.retailPrice)
                : customer.price.message}
            </p>
            {pending ? (
              <p className="text-sm text-muted-foreground">Se actualizează prețul…</p>
            ) : null}
          </div>

          {customer.notices.length > 0 ? (
            <ul className="space-y-1 text-sm text-destructive" role="alert">
              {customer.notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          ) : null}

          {customer.controls.length > 0 ? (
            <ConfiguratorFields
              sections={customer.sections}
              controls={customer.controls}
              revision={revision}
              onPatch={onPatch}
            />
          ) : null}

          {onAddToCart ? (
            <div className="space-y-3">
              <Button type="button" className="w-full" disabled={!orderEnabled} onClick={onAddToCart}>
                Adaugă în coș
              </Button>
              {cartNote ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {cartNote}{" "}
                  <Link href="/cos" className="underline-offset-4 hover:underline">
                    Vezi coșul
                  </Link>
                </p>
              ) : null}
            </div>
          ) : onPlaceOrder ? (
            <OrderForm
              disabled={!orderEnabled}
              contextNote={orderContextNote}
              onPlace={onPlaceOrder}
            />
          ) : null}
        </div>
      </div>

      <div className="mt-16 space-y-14 border-t border-border pt-14">
        {showDescription && copy ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">Descriere</h2>
            <RichContent document={copy.description} />
          </section>
        ) : null}
        {showHighlights && copy ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">Avantaje</h2>
            <RichContent document={copy.highlightsDocument} />
          </section>
        ) : null}
        {specs.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">Specificații tehnice</h2>
            <dl className="max-w-3xl divide-y divide-border border-y border-border">
              {specs.map((spec) => (
                <div key={spec.id} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
                  <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                  <dd className="text-sm leading-6">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}
        {showCare && copy ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">Întreținere</h2>
            <RichContent document={copy.careDocument} />
          </section>
        ) : null}
        {showWarranty || showDelivery ? (
          <section className="space-y-8">
            <h2 className="text-2xl font-medium tracking-tight">Garanție și livrare</h2>
            {showWarranty && copy ? <RichContent document={copy.warrantyDocument} /> : null}
            {showDelivery && copy ? <RichContent document={copy.deliveryDocument} /> : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
