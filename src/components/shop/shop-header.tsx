"use client";

import Link from "next/link";

import { useCart } from "@/components/shop/cart-provider";

export function ShopHeader() {
  const cart = useCart();
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-5">
        <Link href="/" className="text-sm tracking-[0.32em] uppercase">
          ZERA
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/catalog" className="underline-offset-4 hover:underline">
            Catalog
          </Link>
          <Link href="/cos" className="underline-offset-4 hover:underline">
            Coș{cart.count > 0 ? ` (${cart.count})` : ""}
          </Link>
          <Link href="/admin" className="text-muted-foreground underline-offset-4 hover:underline">
            Administrare
          </Link>
        </nav>
      </div>
    </header>
  );
}
