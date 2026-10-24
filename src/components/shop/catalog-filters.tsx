import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CatalogFilters } from "@/modules/shop/catalog";

type Props = {
  filters: CatalogFilters;
  categories: Array<{ name: string; slug: string }>;
  shapes: Array<{ id: string; label: string }>;
};

export function CatalogFilters({ filters, categories, shapes }: Props) {
  return (
    <form action="/catalog" method="get" className="grid gap-4 rounded-xl border border-border p-4">
      <div className="grid gap-1.5">
        <Label htmlFor="catalog-q">Căutare</Label>
        <Input id="catalog-q" name="q" defaultValue={filters.q} placeholder="Nume sau formă" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor="catalog-category">Categorie</Label>
          <select
            id="catalog-category"
            name="categorie"
            defaultValue={filters.category}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Toate</option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="catalog-shape">Formă</Label>
          <select
            id="catalog-shape"
            name="forma"
            defaultValue={filters.shape}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="">Toate</option>
            {shapes.map((shape) => (
              <option key={shape.id} value={shape.id}>
                {shape.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField id="latime-min" name="latimeMin" label="Lățime min, mm" value={filters.minWidth} />
        <NumberField id="latime-max" name="latimeMax" label="Lățime max, mm" value={filters.maxWidth} />
        <NumberField id="inaltime-min" name="inaltimeMin" label="Înălțime min, mm" value={filters.minHeight} />
        <NumberField id="inaltime-max" name="inaltimeMax" label="Înălțime max, mm" value={filters.maxHeight} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField id="pret-min" name="pretMin" label="Preț min, MDL" value={filters.minPrice} />
        <NumberField id="pret-max" name="pretMax" label="Preț max, MDL" value={filters.maxPrice} />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button type="submit">Filtrează</Button>
        <Link href="/catalog" className="inline-flex h-8 items-center text-sm underline-offset-4 hover:underline">
          Resetează
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
