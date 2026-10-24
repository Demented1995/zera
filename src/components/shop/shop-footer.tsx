import Link from "next/link";

import type { PublicCompany } from "@/modules/shop/catalog";

export function ShopFooter({ company }: { company: PublicCompany }) {
  const lines = [
    company.legalName,
    company.taxId ? `IDNO ${company.taxId}` : null,
    company.address,
    company.phone,
    company.email,
  ].filter((line): line is string => Boolean(line && line.trim()));

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm tracking-[0.28em] uppercase">ZERA</p>
          <Link href="/catalog" className="text-sm underline-offset-4 hover:underline">
            Catalog
          </Link>
        </div>
        {lines.length > 0 ? (
          <address className="space-y-1 text-sm leading-6 text-muted-foreground not-italic">
            {lines.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </address>
        ) : null}
      </div>
    </footer>
  );
}
