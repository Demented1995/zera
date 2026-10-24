import type { MetadataRoute } from "next";

import { publicSiteUrl } from "@/modules/shop/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/login", "/api"],
    },
    sitemap: `${publicSiteUrl()}/sitemap.xml`,
  };
}
