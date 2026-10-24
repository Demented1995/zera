import type { MetadataRoute } from "next";

import { listPublicModelPaths } from "@/modules/shop/catalog";
import { publicSiteUrl } from "@/modules/shop/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = publicSiteUrl();
  const models = await listPublicModelPaths();
  const categories = [...new Set(models.map((model) => model.category.slug))];
  return [
    { url: `${origin}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/catalog`, changeFrequency: "daily", priority: 0.9 },
    ...categories.map((slug) => ({
      url: `${origin}/catalog?categorie=${encodeURIComponent(slug)}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...models.map((model) => ({
      url: `${origin}/catalog/${model.slug}`,
      lastModified: model.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
