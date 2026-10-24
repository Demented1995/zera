import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

import { ShopProduct } from "@/components/shop/shop-product";
import { findForbiddenCommercialKey } from "@/modules/catalog/preview/guard";
import { findPublicSlugRedirect, findSellableBySlug } from "@/modules/shop/catalog";
import { quotePublicProduct } from "@/modules/shop/service";
import { jsonForScript, publicSiteUrl } from "@/modules/shop/site";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const model = await findSellableBySlug(slug);
  if (!model) {
    return { title: "Produs" };
  }
  const title = model.seoTitle?.trim() || model.name;
  const description = model.seoDescription?.trim() || model.shortDescription?.trim() || undefined;
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

export default async function PublicProductPage({ params }: PageProps) {
  const { slug } = await params;
  const model = await findSellableBySlug(slug);
  if (!model) {
    const nextSlug = await findPublicSlugRedirect(slug);
    if (nextSlug) {
      permanentRedirect(`/catalog/${nextSlug}`);
    }
    notFound();
  }

  const preview = await quotePublicProduct({ modelId: model.id, request: {} });
  if (!preview.ok) {
    notFound();
  }

  const images = preview.customer.gallery.map(
    (image) => `${publicSiteUrl()}${image.src}`,
  );
  const description =
    model.seoDescription?.trim() || model.shortDescription?.trim() || model.name;
  const price = preview.customer.price.retailPrice;
  const structured: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: model.name,
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
      price: price.toFixed(2),
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
      <ShopProduct modelId={model.id} slug={model.slug} initial={preview.customer} />
    </div>
  );
}
