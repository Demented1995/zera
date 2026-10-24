"use client";

import { useState } from "react";

import { ProductPreviewScreen } from "@/components/catalog/product-preview-screen";
import { useCart } from "@/components/shop/cart-provider";
import type { CustomerPreviewPayload } from "@/modules/catalog/preview/types";
import { quotePublicProductAction } from "@/modules/shop/actions";

const CART_NOTE: Record<string, string> = {
  added: "Adăugat în coș.",
  updated: "Cantitatea din coș a fost actualizată.",
  full: "Coșul poate avea cel mult 8 configurații.",
  max: "Cantitatea maximă pentru această configurație este 20.",
};

export function ShopProduct({
  modelId,
  slug,
  initial,
}: {
  modelId: string;
  slug: string;
  initial: CustomerPreviewPayload;
}) {
  const cart = useCart();
  const [note, setNote] = useState<string | null>(null);

  return (
    <ProductPreviewScreen
      modelId={modelId}
      slug={slug}
      initial={initial}
      quoteAction={quotePublicProductAction}
      cartNote={note}
      onAddToCart={(draft) => {
        const result = cart.add(draft);
        setNote(CART_NOTE[result] ?? null);
      }}
    />
  );
}
