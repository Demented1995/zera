import { prisma } from "@/lib/db/prisma";
import { mediaPath } from "@/modules/catalog/images/service";
import type { ShopLocale } from "@/modules/shop/locale";
import { localizePhrase } from "@/modules/shop/phrases";

export const HOMEPAGE_CATEGORY_LIMIT = 4;

export type HomepageCategoryCard = {
  id: string;
  name: string;
  slug: string;
  caption: string | null;
  image: { src: string; alt: string } | null;
};

export async function listHomepageCategories(locale: ShopLocale = "ro"): Promise<HomepageCategoryCard[]> {
  const rows = await prisma.mirrorModelCategory.findMany({
    where: { isActive: true, featuredOnHome: true },
    orderBy: [{ homeSortOrder: "asc" }, { name: "asc" }],
    take: HOMEPAGE_CATEGORY_LIMIT,
    select: {
      id: true,
      name: true,
      slug: true,
      homeCaption: true,
      homeCaptionRu: true,
      nameRu: true,
      models: {
        where: { isPublished: true, status: "ACTIVE" },
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: {
          id: true,
          name: true,
          images: {
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            take: 1,
            select: { id: true, altText: true },
          },
        },
      },
    },
  });

  return rows.map((row) => {
    const model = row.models[0];
    const image = model?.images[0];
    const caption =
      (locale === "ru" ? row.homeCaptionRu?.trim() : "") || row.homeCaption?.trim() || null;
    const name =
      locale === "ru" ? row.nameRu?.trim() || localizePhrase("ru", row.name) : row.name;
    return {
      id: row.id,
      name,
      slug: row.slug,
      caption,
      image:
        model && image
          ? {
              src: mediaPath(model.id, image.id, "display"),
              alt: image.altText.trim() || name,
            }
          : null,
    };
  });
}


export function homepageSelectionMessage(count: number): string | null {
  if (count > HOMEPAGE_CATEGORY_LIMIT) {
    return "Poți afișa cel mult 4 categorii pe pagina principală.";
  }
  return null;
}
