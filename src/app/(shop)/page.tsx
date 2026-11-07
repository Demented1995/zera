import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { CustomProjectDialog } from "@/components/shop/custom-project-dialog";
import { ProductCard } from "@/components/shop/product-card";
import { listPublicModels, parseCatalogFilters } from "@/modules/shop/catalog";
import { listHomepageCategories } from "@/modules/shop/homepage";
import { getShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

export const metadata: Metadata = {
  title: { absolute: "ZERA" },
  description: "Oglinzi ZERA. Catalogul public arată doar modelele active, cu preț în MDL.",
};

export default async function HomePage() {
  const locale = await getShopLocale();
  const [catalog, homepageCategories] = await Promise.all([
    listPublicModels(parseCatalogFilters({ page: "1" }), locale),
    listHomepageCategories(locale),
  ]);
  const featured = catalog.rows.slice(0, 6);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-20 px-5 py-16 sm:py-24">
      {homepageCategories.length > 0 ? (
        <section>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {homepageCategories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/catalog?categorie=${encodeURIComponent(category.slug)}`}
                  className="group relative flex aspect-[3/4] overflow-hidden rounded-2xl bg-muted"
                >
                  {category.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.image.src}
                      alt={category.image.alt}
                      className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                    />
                  ) : null}
                  <span
                    className={
                      category.image
                        ? "relative mt-auto flex w-full items-end justify-between gap-3 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 text-white"
                        : "relative mt-auto flex w-full items-end justify-between gap-3 p-4 text-foreground"
                    }
                  >
                    <span className="min-w-0">
                      <span className="block text-lg font-semibold tracking-tight">
                        {category.name}
                      </span>
                      {category.caption ? (
                        <span
                          className={
                            category.image
                              ? "mt-1 block text-sm text-white/80"
                              : "mt-1 block text-sm text-muted-foreground"
                          }
                        >
                          {category.caption}
                        </span>
                      ) : null}
                    </span>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full border border-current">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col items-start gap-4 rounded-2xl border border-border px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-2">
          <h2 className="text-2xl font-medium tracking-tight">{t(locale, "customProjectTitle")}</h2>
          <p className="text-sm leading-6 text-muted-foreground">{t(locale, "customProjectLead")}</p>
        </div>
        <CustomProjectDialog locale={locale} />
      </section>

      <section className="space-y-8">
        <h1 className="text-2xl font-medium tracking-tight">{t(locale, "availableModels")}</h1>
        {featured.length === 0 ? (
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            {t(locale, "nonePublished")}
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
