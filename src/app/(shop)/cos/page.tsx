import type { Metadata } from "next";

import { CartView } from "@/components/shop/cart-view";

export const metadata: Metadata = {
  title: "Coș",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <header className="mb-10 space-y-3">
        <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">ZERA</p>
        <h1 className="text-4xl font-semibold tracking-tight">Coș</h1>
      </header>
      <CartView />
    </div>
  );
}
