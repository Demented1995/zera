import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogFilters } from "@/modules/shop/catalog";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

type Props = {
  filters: CatalogFilters;
  categories: Array<{ name: string; slug: string }>;
  shapes: Array<{ id: string; label: string }>;
  locale?: ShopLocale;
};

export function CatalogFilters({ filters, categories, shapes, locale = "ro" }: Props) {
  return (
    <form action="/catalog" method="get" className="grid gap-4 rounded-xl border border-border p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="catalog-q">{t(locale, "search")}</Label>
        <Input id="catalog-q" name="q" defaultValue={filters.q} placeholder={t(locale, "searchPlaceholder")} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="catalog-category">{t(locale, "category")}</Label>
          <select
            id="catalog-category"
            name="categorie"
            defaultValue={filters.category}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">{t(locale, "all")}</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="catalog-shape">{t(locale, "shape")}</Label>
          <select
            id="catalog-shape"
            name="forma"
            defaultValue={filters.shape}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">{t(locale, "all")}</option>
            {shapes.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField id="latime-min" name="latimeMin" label={t(locale, "widthMin")} value={filters.minWidth} />
        <NumberField id="latime-max" name="latimeMax" label={t(locale, "widthMax")} value={filters.maxWidth} />
        <NumberField id="inaltime-min" name="inaltimeMin" label={t(locale, "heightMin")} value={filters.minHeight} />
        <NumberField id="inaltime-max" name="inaltimeMax" label={t(locale, "heightMax")} value={filters.maxHeight} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField id="pret-min" name="pretMin" label={t(locale, "priceMin")} value={filters.minPrice} />
        <NumberField id="pret-max" name="pretMax" label={t(locale, "priceMax")} value={filters.maxPrice} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{t(locale, "filter")}</Button>
        <Link href="/catalog" className="inline-flex h-8 items-center text-sm underline-offset-4 hover:underline">
          {t(locale, "reset")}
        </Link>
      </div>
    </form>
  );
}

function NumberField({
  id,
  name,
  label,
  value,
}: {
  id: string;
  name: string;
  label: string;
  value: number | null;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} name={name} inputMode="decimal" defaultValue={value ?? ""} />
    </div>
  );
}
