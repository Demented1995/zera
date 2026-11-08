import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ShopProduct } from "@/components/shop/shop-product";
import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { findPublicSlugRedirect, findSellableBySlug } from "@/modules/shop/catalog";
import { readProductTranslation } from "@/modules/catalog/content/translation";
import { getShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";
import { readSharedConfiguration } from "@/modules/shop/share";
import { quotePublicProduct } from "@/modules/shop/service";
import { jsonForScript, publicSiteUrl } from "@/modules/shop/site";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ c?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [model, locale] = await Promise.all([findSellableBySlug(slug), getShopLocale()]);
  if (!model) {
    return { title: t(locale, "product") };
  }
  const russian = locale === "ru" ? readProductTranslation(model.translationsJson) : null;
  const title = russian?.seoTitle || model.seoTitle?.trim() || russian?.name || model.name;
  const description =
    russian?.seoDescription ||
    model.seoDescription?.trim() ||
    russian?.shortDescription ||
    model.shortDescription?.trim() ||
    undefined;
  return {
    title,
    description,
    alternates: { canonical: `/catalog/${model.slug}` },
    openGraph: {
      title,
      description,
      url: `/catalog/${model.slug}`,
      type: "website",
    },
  };
}

export default async function PublicProductPage({ params, searchParams }: PageProps) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams ? searchParams : Promise.resolve({} as { c?: string }),
  ]);
  const [model, locale] = await Promise.all([findSellableBySlug(slug), getShopLocale()]);
  if (!model) {
    const nextSlug = await findPublicSlugRedirect(slug);
    if (nextSlug) {
      permanentRedirect(`/catalog/${nextSlug}`);
    }
    notFound();
  }

  const shared = query.c ? await readSharedConfiguration(query.c, model.id) : null;
  const preview = await quotePublicProduct({ modelId: model.id, request: shared ?? {} });
  if (!preview.ok) {
    notFound();
  }

  const images = preview.customer.gallery.map(
    (image) => `${publicSiteUrl()}${image.src}`,
  );
  const russian = locale === "ru" ? readProductTranslation(model.translationsJson) : null;
  const description =
    russian?.seoDescription ||
    model.seoDescription?.trim() ||
    russian?.shortDescription ||
    model.shortDescription?.trim() ||
    russian?.name ||
    model.name;
  const price = preview.customer.price.retailPrice;
  const structured: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: russian?.name || model.name,
    description,
    sku: model.code,
    brand: { "@type": "Brand", name: "ZERA" },
    url: `${publicSiteUrl()}/catalog/${model.slug}`,
  };
  if (images.length > 0) {
    structured.image = images;
  }
  if (price != null) {
    structured.offers = {
      "@type": "Offer",
      priceCurrency: "MDL",
      price: String(price),
      availability: "https://schema.org/InStock",
      url: `${publicSiteUrl()}/catalog/${model.slug}`,
    };
  }
  if (findForbiddenCommercialKey(structured)) {
    delete structured.offers;
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonForScript(structured) }} />
      <ShopProduct modelId={model.id} slug={model.slug} initial={preview.customer} locale={locale} />
    </div>
  );
}
