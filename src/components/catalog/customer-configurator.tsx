"use client";

import { useState } from "react";

import { ConfiguratorFields } from "@/components/catalog/configurator-fields";
import type {
  CustomerPreviewPayload,
  PreviewGalleryImage,
  PreviewPatch,
} from "@/modules/catalog/preview/types";

type Props = {
  customer: CustomerPreviewPayload;
  pending: boolean;
  revision: number;
  onPatch: (patch: PreviewPatch) => void;
};

export function CustomerConfigurator({
  customer,
  pending,
  revision,
  onPatch,
}: Props) {
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start">
      <ModelVisual gallery={customer.gallery ?? []} />
      <div className="space-y-8">
        <header className="space-y-3">
          <p className="text-xs tracking-[0.22em] text-muted-foreground uppercase">
            {customer.model.code}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">
            {customer.model.name}
          </h2>
          {customer.model.shortDescription ? (
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              {customer.model.shortDescription}
            </p>
          ) : null}
          {customer.model.fullDescription ? (
            <p className="max-w-xl text-sm leading-6 whitespace-pre-line">
              {customer.model.fullDescription}
            </p>
          ) : null}
          {customer.productCopy?.highlights.length ? (
            <ul className="max-w-xl list-disc space-y-1 pl-5 text-sm leading-6">
              {customer.productCopy.highlights.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          ) : null}
          {customer.productCopy?.specs.length ? (
            <dl className="max-w-xl space-y-2 text-sm">
              {customer.productCopy.specs.map((spec) => (
                <div key={spec.label} className="grid gap-1 sm:grid-cols-[9rem_1fr]">
                  <dt className="text-muted-foreground">{spec.label}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </header>

        <PriceSummary customer={customer} pending={pending} />

        <ProductNotes copy={customer.productCopy} />

        <ConfiguratorFields
          sections={customer.sections}
          controls={customer.controls}
          revision={revision}
          onPatch={onPatch}
        />
      </div>
    </div>
  );
}

function ProductNotes({
  copy,
}: {
  copy: CustomerPreviewPayload["productCopy"];
}) {
  if (!copy) {
    return null;
  }
  const notes = [
    copy.care ? { title: "Întreținere", text: copy.care } : null,
    copy.warranty ? { title: "Garanție", text: copy.warranty } : null,
    copy.delivery ? { title: "Producție și livrare", text: copy.delivery } : null,
  ].filter((note): note is { title: string; text: string } => Boolean(note));
  if (notes.length === 0) {
    return null;
  }
  return (
    <div className="max-w-xl space-y-4">
      {notes.map((note) => (
        <section key={note.title} className="space-y-1">
          <h3 className="text-sm font-medium">{note.title}</h3>
          <p className="text-sm leading-6 whitespace-pre-line text-muted-foreground">{note.text}</p>
        </section>
      ))}
    </div>
  );
}

function ModelVisual({ gallery }: { gallery: PreviewGalleryImage[] }) {
  const initial = gallery.find((image) => image.isPrimary)?.id ?? gallery[0]?.id ?? null;
  const [activeId, setActiveId] = useState(initial);
  const active = gallery.find((image) => image.id === activeId) ?? gallery[0];

  if (!active) {
    return <ModelPlaceholder />;
  }

  return (
    <div className="space-y-3 lg:sticky lg:top-6">
      <div className="flex aspect-[5/4] max-h-80 items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/40 lg:aspect-[4/5] lg:max-h-none">
        {/* Authenticated media route; next/image would not forward the staff session. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={active.src}
          alt={active.alt || "Fotografia modelului"}
          className="h-full w-full object-contain"
        />
      </div>
      {gallery.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((image) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActiveId(image.id)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border ${
                image.id === active.id ? "border-foreground" : "border-border"
              }`}
              aria-label={image.alt || "Fotografie"}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.thumbSrc} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ModelPlaceholder() {
  return (
    <div className="lg:sticky lg:top-6">
      <div className="flex aspect-[5/4] max-h-80 items-center justify-center rounded-2xl border border-border bg-muted/40 lg:aspect-[4/5] lg:max-h-none">
        <div className="flex w-40 flex-col items-center gap-4 text-center">
          <div className="h-28 w-20 rounded-full border border-foreground/15 bg-background shadow-sm" />
          <div>
            <p className="text-xs tracking-[0.28em] text-muted-foreground">ZERA</p>
            <p className="mt-1 text-sm text-muted-foreground">Fără fotografie</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceSummary({
  customer,
  pending,
}: {
  customer: CustomerPreviewPayload;
  pending: boolean;
}) {
  const formatted =
    customer.price.available && customer.price.retailPrice != null
      ? `${new Intl.NumberFormat("ro-RO", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(customer.price.retailPrice)} MDL`
      : null;

  return (
    <div
      className="rounded-2xl border border-border bg-card px-5 py-4"
      aria-live="polite"
      aria-busy={pending}
    >
      <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
        Preț retail
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">
        {formatted ?? customer.price.message}
      </p>
      {pending ? (
        <p className="mt-2 text-sm text-muted-foreground">Se recalculează prețul…</p>
      ) : null}
      {customer.notices.length > 0 ? (
        <ul className="mt-3 space-y-1 text-sm text-destructive">
          {customer.notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
