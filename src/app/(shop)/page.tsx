import type { Metadata } from "next";
import Link from "next/link";

import { ProductCard } from "@/components/shop/product-card";
import { catalogFacets, listPublicModels, parseCatalogFilters } from "@/modules/shop/catalog";

export const metadata: Metadata = {
  title: { absolute: "ZERA" },
  description: "Oglinzi ZERA. Catalogul public arată doar modelele active, cu preț în MDL.",
};

export default async function HomePage() {
  const [catalog, facets] = await Promise.all([
    listPublicModels(parseCatalogFilters({ page: "1" })),
    catalogFacets(),
  ]);
  const featured = catalog.rows.slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-20 px-5 py-16 sm:py-24">
      <section className="max-w-3xl space-y-6">
        <p className="text-xs tracking-[0.32em] text-muted-foreground uppercase">ZERA</p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">Oglinzi</h1>
        <p className="max-w-xl text-base leading-7 text-muted-foreground">
          Modelele publicate pot fi configurate. Prețul se calculează în MDL, fără cont de client.
        </p>
        <Link
          href="/catalog"
          className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground"
        >
          Vezi catalogul
        </Link>
      </section>

      {facets.categories.length > 0 ? (
        <section className="space-y-4">
          <h2 className="text-sm tracking-[0.18em] text-muted-foreground uppercase">Categorii</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {facets.categories.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/catalog?categorie=${encodeURIComponent(category.slug)}`}
                  className="underline-offset-4 hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-8">
        <h2 className="text-2xl font-medium tracking-tight">Modele disponibile</h2>
        {featured.length === 0 ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Niciun model nu este publicat momentan. În catalog apar doar modelele active, marcate
            pentru vânzare și cu preț complet.
          </p>
        ) : (
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((model) => (
              <ProductCard key={model.id} model={model} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
