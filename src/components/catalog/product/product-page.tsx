"use client";

import Link from "next/link";

import { ConfiguratorFields } from "@/components/catalog/configurator-fields";
import { OneClickOrder } from "@/components/catalog/product/one-click-order";
import { OrderForm } from "@/components/catalog/product/order-form";
import { ProductGallery } from "@/components/catalog/product/product-gallery";
import { RichContent } from "@/components/catalog/product/rich-content";
import { Button } from "@/components/ui/button";
import { isEmptyDocument } from "@/modules/catalog/content/document";
import { productStatusNote } from "@/modules/catalog/preview/product-presentation";
import type { CustomerPreviewPayload, PreviewPatch } from "@/modules/catalog/preview/types";
import {
  formatMdl,
  type OneClickOrderInput,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/modules/orders/public";
import { selectedOptionSpecs } from "@/modules/shop/cart-summary";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

type Props = {
  customer: CustomerPreviewPayload;
  pending: boolean;
  revision: number;
  onPatch: (patch: PreviewPatch) => void;
  onPlaceOrder?: (input: PlaceOrderInput) => Promise<PlaceOrderResult>;
  onOneClick?: (input: OneClickOrderInput) => Promise<PlaceOrderResult>;
  onAddToCart?: () => void;
  cartNote?: string | null;
  orderContextNote?: string;
  locale?: ShopLocale;
};

export function ProductPage({
  customer,
  pending,
  revision,
  onPatch,
  onPlaceOrder,
  onOneClick,
  onAddToCart,
  cartNote,
  orderContextNote,
  locale = "ro",
}: Props) {
  const copy = customer.productCopy;
  const statusNote = productStatusNote(customer.model.status);
  const priceReady = customer.price.available && customer.price.retailPrice != null;
  const orderEnabled =
    customer.model.status !== "ARCHIVED" &&
    priceReady &&
    !pending &&
    customer.notices.length === 0;

  const selectedSpecs = (
    customer.controls.length > 0
      ? selectedOptionSpecs(customer.controls)
      : (copy?.specs ?? [])
  ).map((spec, index) => ({ id: `${spec.label}-${index}`, ...spec }));
  const specs = [...selectedSpecs, ...(copy?.extraSpecs ?? [])];
  const showDescription = copy ? !isEmptyDocument(copy.description) : false;
  const showHighlights = copy ? !isEmptyDocument(copy.highlightsDocument) : false;
  const showCare = copy ? !isEmptyDocument(copy.careDocument) : false;
  const showWarranty = copy ? !isEmptyDocument(copy.warrantyDocument) : false;
  const showDelivery = copy ? !isEmptyDocument(copy.deliveryDocument) : false;

  return (
    <article className="overflow-x-clip bg-background pb-24 text-foreground sm:pb-0">
      <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={customer.gallery} locale={locale} />
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
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{t(locale, "price")}</p>
            <p className={`text-3xl font-semibold tracking-tight ${pending ? "opacity-60" : ""}`}>
              {priceReady && customer.price.retailPrice != null
                ? formatMdl(customer.price.retailPrice)
                : customer.price.message}
            </p>
            <p className="min-h-5 text-sm text-muted-foreground">
              {pending ? t(locale, "updatingPrice") : ""}
            </p>
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
              locale={locale}
            />
          ) : null}

          {onAddToCart || onOneClick ? (
            <div className="space-y-3">
              {onAddToCart ? (
                <Button type="button" className="w-full" disabled={!orderEnabled} onClick={onAddToCart}>
                  {t(locale, "addToCart")}
                </Button>
              ) : null}
              {onOneClick ? (
                <OneClickOrder disabled={!orderEnabled} onPlace={onOneClick} locale={locale} />
              ) : null}
              {cartNote ? (
                <p className="text-sm text-muted-foreground" role="status">
                  {cartNote}{" "}
                  <Link href="/cos" className="underline-offset-4 hover:underline">
                    {t(locale, "viewCart")}
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur sm:hidden">
        <p className="text-[0.65rem] tracking-[0.16em] text-muted-foreground uppercase">{t(locale, "price")}</p>
        <p className="text-xl font-semibold tracking-tight">
          {priceReady && customer.price.retailPrice != null
            ? formatMdl(customer.price.retailPrice)
            : customer.price.message}
        </p>
      </div>

      <div className="mt-16 space-y-14 border-t border-border pt-14">
        {showDescription && copy ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">{t(locale, "description")}</h2>
            <RichContent document={copy.description} />
          </section>
        ) : null}
        {showHighlights && copy ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">{t(locale, "highlights")}</h2>
            <RichContent document={copy.highlightsDocument} />
          </section>
        ) : null}
        {specs.length > 0 ? (
          <section className="space-y-4">
            <h2 className="text-2xl font-medium tracking-tight">{t(locale, "specs")}</h2>
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
            <h2 className="text-2xl font-medium tracking-tight">{t(locale, "care")}</h2>
            <RichContent document={copy.careDocument} />
          </section>
        ) : null}
        {showWarranty || showDelivery ? (
          <section className="space-y-8">
            <h2 className="text-2xl font-medium tracking-tight">{t(locale, "warrantyDelivery")}</h2>
            {showWarranty && copy ? <RichContent document={copy.warrantyDocument} /> : null}
            {showDelivery && copy ? <RichContent document={copy.deliveryDocument} /> : null}
          </section>
        ) : null}
      </div>
    </article>
  );
}
