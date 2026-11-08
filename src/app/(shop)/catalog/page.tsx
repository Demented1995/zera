import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { getPublicCategory, listPublicModels, parseCatalogFilters } from "@/modules/shop/catalog";
import { getShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getShopLocale();
  return {
    title: t(locale, "catalog"),
    description: t(locale, "catalogMeta"),
  };
}

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    categorie?: string;
    page?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const locale = await getShopLocale();
  const filters = parseCatalogFilters({
    q: params.q,
    categorie: params.categorie,
    page: params.page,
  });
  const [catalog, category] = await Promise.all([
    listPublicModels(filters, locale),
    filters.category ? getPublicCategory(filters.category, locale) : Promise.resolve(null),
  ]);

  function hrefFor(nextPage: number) {
    const search = new URLSearchParams();
    if (filters.q) {
      search.set("q", filters.q);
    }
    if (filters.category) {
      search.set("categorie", filters.category);
    }
    search.set("page", String(nextPage));
    return `/catalog?${search.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:py-16">
      <header className="max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight">{category?.name ?? t(locale, "catalog")}</h1>
      </header>

      {catalog.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t(locale, "noMatches")}</p>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.rows.map((model) => (
            <ProductCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {catalog.total} {catalog.total === 1 ? t(locale, "modelOne") : t(locale, "modelMany")} · {t(locale, "pageOf")} {catalog.page} {t(locale, "of")}{" "}
          {catalog.pages}
        </p>
        <div className="flex gap-4">
          {catalog.page > 1 ? (
            <Link href={hrefFor(catalog.page - 1)} className="underline-offset-4 hover:underline">
              {t(locale, "previous")}
            </Link>
          ) : null}
          {catalog.page < catalog.pages ? (
            <Link href={hrefFor(catalog.page + 1)} className="underline-offset-4 hover:underline">
              {t(locale, "next")}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
