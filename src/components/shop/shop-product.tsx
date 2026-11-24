"use client";

import { useState } from "react";

import { ProductPreviewScreen } from "@/components/catalog/product-preview-screen";
import { useCart } from "@/components/shop/cart-provider";
import type { CustomerPreviewPayload } from "@/modules/catalog/preview/types";
import { placeOneClickOrderAction, quotePublicProductAction } from "@/modules/shop/actions";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

const CART_NOTE = {
  added: "added",
  updated: "updated",
  full: "cartFull",
  max: "cartMax",
} as const;

export function ShopProduct({
  modelId,
  slug,
  initial,
  locale = "ro",
  phone = null,
}: {
  modelId: string;
  slug: string;
  initial: CustomerPreviewPayload;
  locale?: ShopLocale;
  phone?: string | null;
}) {
  const cart = useCart();
  const [note, setNote] = useState<string | null>(null);

  return (
    <ProductPreviewScreen
      modelId={modelId}
      slug={slug}
      initial={initial}
      quoteAction={quotePublicProductAction}
      placeOneClick={placeOneClickOrderAction}
      cartNote={note}
      locale={locale}
      phone={phone}
      onAddToCart={(draft) => {
        const result = cart.add(draft);
        const key = CART_NOTE[result as keyof typeof CART_NOTE];
        setNote(key ? t(locale, key) : null);
      }}
    />
  );
}
