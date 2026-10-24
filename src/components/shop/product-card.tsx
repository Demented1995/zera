import Link from "next/link";

import { formatMdl } from "@/modules/orders/public";
import type { PublicModelCard } from "@/modules/shop/catalog";

export function ProductCard({ model }: { model: PublicModelCard }) {
  return (
    <article className="min-w-0 space-y-4">
      <Link href={`/catalog/${model.slug}`} className="block space-y-4">
        <div className="aspect-[4/5] overflow-hidden bg-muted">
          {model.image ? (
            // Authenticated cookies are not required; published display variants are public.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={model.image.src}
              alt={model.image.alt}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-medium tracking-tight">{model.name}</h2>
          <p className="text-sm text-muted-foreground">
            {model.categoryName} · {model.shapeLabel} · {model.widthMm} × {model.heightMm} mm
          </p>
          <p className="text-sm">{formatMdl(model.retailPrice)}</p>
        </div>
      </Link>
    </article>
  );
}
