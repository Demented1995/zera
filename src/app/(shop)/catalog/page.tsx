import type { Metadata } from "next";
import Link from "next/link";

import { CatalogFilters } from "@/components/shop/catalog-filters";
import { ProductCard } from "@/components/shop/product-card";
import { catalogFacets, listPublicModels, parseCatalogFilters } from "@/modules/shop/catalog";

export const metadata: Metadata = {
  title: "Catalog",
  description: "Catalogul public ZERA. Căutare și filtrare după categorie, formă, dimensiuni și preț.",
};

type PageProps = {
  searchParams?: Promise<{
    q?: string;
    categorie?: string;
    forma?: string;
    latimeMin?: string;
    latimeMax?: string;
    inaltimeMin?: string;
    inaltimeMax?: string;
    pretMin?: string;
    pretMax?: string;
    page?: string;
  }>;
};

export default async function CatalogPage({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : {};
  const filters = parseCatalogFilters(params);
  const [catalog, facets] = await Promise.all([
    listPublicModels(filters),
    catalogFacets(),
  ]);
  const selectedCategory = facets.categories.find((category) => category.slug === filters.category);

  function hrefFor(nextPage: number) {
    const search = new URLSearchParams();
    if (filters.q) search.set("q", filters.q);
    if (filters.category) search.set("categorie", filters.category);
    if (filters.shape) search.set("forma", filters.shape);
    if (filters.minWidth != null) search.set("latimeMin", String(filters.minWidth));
    if (filters.maxWidth != null) search.set("latimeMax", String(filters.maxWidth));
    if (filters.minHeight != null) search.set("inaltimeMin", String(filters.minHeight));
    if (filters.maxHeight != null) search.set("inaltimeMax", String(filters.maxHeight));
    if (filters.minPrice != null) search.set("pretMin", String(filters.minPrice));
    if (filters.maxPrice != null) search.set("pretMax", String(filters.maxPrice));
    search.set("page", String(nextPage));
    return `/catalog?${search.toString()}`;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 px-5 py-12 sm:py-16">
      <header className="max-w-2xl space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight">Catalog</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Prețul afișat este prețul cu amănuntul salvat pentru configurația standard, în MDL.
        </p>
        {selectedCategory?.description ? (
          <p className="text-sm leading-6">{selectedCategory.description}</p>
        ) : null}
      </header>

      <CatalogFilters filters={filters} categories={facets.categories} shapes={facets.shapes} />

      {catalog.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Niciun model pentru filtrele alese.</p>
      ) : (
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {catalog.rows.map((model) => (
            <ProductCard key={model.id} model={model} />
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <p>
          {catalog.total} {catalog.total === 1 ? "model" : "modele"} · pagina {catalog.page} din{" "}
          {catalog.pages}
        </p>
        <div className="flex gap-4">
          {catalog.page > 1 ? (
            <Link href={hrefFor(catalog.page - 1)} className="underline-offset-4 hover:underline">
              Pagina anterioară
            </Link>
          ) : null}
          {catalog.page < catalog.pages ? (
            <Link href={hrefFor(catalog.page + 1)} className="underline-offset-4 hover:underline">
              Pagina următoare
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
