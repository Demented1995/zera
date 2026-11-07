import type { ReactNode } from "react";

import { CartProvider } from "@/components/shop/cart-provider";
import { ShopFooter } from "@/components/shop/shop-footer";
import { ShopHeader } from "@/components/shop/shop-header";
import { getCompanySettings } from "@/modules/offers/company";
import { shopContactLinks } from "@/modules/shop/contact-links";
import { getShopLocale } from "@/modules/shop/locale";

export const dynamic = "force-dynamic";

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const [company, locale] = await Promise.all([getCompanySettings(), getShopLocale()]);
  return (
    <CartProvider>
      <div className="flex min-h-full flex-1 flex-col bg-background text-foreground">
        <ShopHeader contacts={shopContactLinks(company.phone, locale)} locale={locale} />
        <main className="flex-1">{children}</main>
        <ShopFooter
          company={{
            legalName: company.legalName,
            taxId: company.taxId,
            address: company.address,
            phone: company.phone,
            email: company.email,
          }}
          locale={locale}
        />
      </div>
    </CartProvider>
  );
}
