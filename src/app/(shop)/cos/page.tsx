import type { Metadata } from "next";

import { CartView } from "@/components/shop/cart-view";
import { getShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getShopLocale();
  return {
    title: t(locale, "cart"),
    robots: { index: false, follow: false },
  };
}

export default async function CartPage() {
  const locale = await getShopLocale();
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <header className="mb-10 space-y-3">
        <p className="text-xs tracking-[0.28em] text-muted-foreground uppercase">ZERA</p>
        <h1 className="text-4xl font-semibold tracking-tight">{t(locale, "cart")}</h1>
      </header>
      <CartView locale={locale} />
    </div>
  );
}
