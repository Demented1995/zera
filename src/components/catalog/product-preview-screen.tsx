"use client";

import { useRef, useState } from "react";

import { ProductPage } from "@/components/catalog/product/product-page";
import { applyCustomerPatch, isLatestPreviewResponse } from "@/modules/catalog/preview/patch";
import type {
  CustomerPreviewPayload,
  PreviewActionResult,
  PreviewPatch,
} from "@/modules/catalog/preview/types";
import type { PlaceOrderInput, PlaceOrderResult } from "@/modules/orders/public";
import type { CartDraft } from "@/modules/shop/cart";

type QuoteAction = (input: {
  modelId: string;
  request: CustomerPreviewPayload["selection"];
}) => Promise<PreviewActionResult>;

type Props = {
  modelId: string;
  slug?: string;
  initial: CustomerPreviewPayload;
  quoteAction: QuoteAction;
  placeOrder?: (
    input: PlaceOrderInput & {
      modelId: string;
      request: CustomerPreviewPayload["selection"];
    },
  ) => Promise<PlaceOrderResult>;
  onAddToCart?: (draft: CartDraft) => void;
  cartNote?: string | null;
  orderContextNote?: string;
};

export function ProductPreviewScreen({
  modelId,
  slug = "",
  initial,
  quoteAction,
  placeOrder,
  onAddToCart,
  cartNote,
  orderContextNote,
}: Props) {
  const [customer, setCustomer] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const requestId = useRef(0);

  function onPatch(patch: PreviewPatch) {
    const nextSelection = applyCustomerPatch(customer.selection, patch);
    const id = requestId.current + 1;
    requestId.current = id;
    setPending(true);
    setError(null);

    void quoteAction({ modelId, request: nextSelection }).then((result) => {
      if (!isLatestPreviewResponse(id, requestId.current)) {
        return;
      }
      setPending(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setCustomer(result.customer);
      setRevision(id);
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <ProductPage
        customer={customer}
        pending={pending}
        revision={revision}
        onPatch={onPatch}
        cartNote={cartNote}
        orderContextNote={orderContextNote}
        onAddToCart={
          onAddToCart
            ? () => {
                if (customer.price.retailPrice == null) {
                  return;
                }
                const image = customer.gallery.find((item) => item.isPrimary) ?? customer.gallery[0];
                const summary = [
                  ...(customer.productCopy?.specs ?? []).map((spec) => `${spec.label}: ${spec.value}`),
                  ...(customer.productCopy?.extraSpecs ?? []).map((spec) => `${spec.label}: ${spec.value}`),
                ].slice(0, 8);
                onAddToCart({
                  modelId,
                  slug: slug || customer.productCopy?.seo.slug || "",
                  name: customer.model.name,
                  imageSrc: image?.thumbSrc ?? image?.src ?? null,
                  imageAlt: image?.alt || customer.model.name,
                  selection: customer.selection,
                  summary,
                  unitPrice: customer.price.retailPrice,
                });
              }
            : undefined
        }
        onPlaceOrder={
          placeOrder
            ? (input) =>
                placeOrder({
                  modelId,
                  request: customer.selection,
                  customerName: input.customerName,
                  customerPhone: input.customerPhone,
                  deliveryAddress: input.deliveryAddress,
                })
            : undefined
        }
      />
    </div>
  );
}
