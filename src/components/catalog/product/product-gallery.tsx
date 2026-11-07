"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { nextGalleryIndex } from "@/modules/catalog/preview/product-presentation";
import type { PreviewGalleryImage } from "@/modules/catalog/preview/types";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

type Props = {
  images: PreviewGalleryImage[];
  locale?: ShopLocale;
};

export function ProductGallery({ images, locale = "ro" }: Props) {
  const primaryIndex = Math.max(
    0,
    images.findIndex((image) => image.isPrimary),
  );
  const [index, setIndex] = useState(primaryIndex === -1 ? 0 : primaryIndex);
  const [open, setOpen] = useState(false);
  const [magnified, setMagnified] = useState(false);
  const active = images[index] ?? images[0];

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
        return;
      }
      setMagnified(false);
      setIndex((current) =>
        nextGalleryIndex(current, images.length, event.key === "ArrowRight" ? 1 : -1),
      );
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, open]);

  if (!active) {
    return <GalleryPlaceholder locale={locale} />;
  }

  function show(direction: 1 | -1) {
    setMagnified(false);
    setIndex((current) => nextGalleryIndex(current, images.length, direction));
  }

  function openAt(imageIndex: number) {
    setMagnified(false);
    setIndex(imageIndex);
    setOpen(true);
  }

  return (
    <div className="min-w-0 lg:sticky lg:top-6">
      <ul className="grid grid-cols-2 gap-3 sm:gap-4">
        {images.map((image, imageIndex) => (
          <li key={image.id} className="min-w-0">
            <button
              type="button"
              onClick={() => openAt(imageIndex)}
              aria-label={`${t(locale, "enlarge")} ${image.alt || `${t(locale, "productPhoto")} ${imageIndex + 1}`}`}
              className="block aspect-square w-full overflow-hidden rounded-2xl bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {/* Authenticated media route; next/image would not forward the staff session. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.thumbSrc || image.src}
                alt={image.alt || t(locale, "productPhoto")}
                className="h-full w-full object-cover"
                decoding="async"
                fetchPriority={imageIndex === 0 ? "high" : "auto"}
                loading={imageIndex === 0 ? "eager" : "lazy"}
              />
            </button>
          </li>
        ))}
      </ul>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setMagnified(false);
          }
        }}
      >
        <DialogContent closeLabel={t(locale, "close")} className="max-h-[calc(100%-1.5rem)] overflow-hidden bg-background p-3 sm:max-w-5xl">
          <DialogTitle className="sr-only">{t(locale, "enlargedPhoto")}</DialogTitle>
          <DialogDescription className="sr-only">
            {active.alt || t(locale, "productPhoto")}
            {images.length > 1 ? `. ${index + 1} ${t(locale, "of")} ${images.length}` : ""}
          </DialogDescription>
          <div className="max-h-[75vh] overflow-auto">
            <button
              type="button"
              onClick={() => setMagnified((value) => !value)}
              aria-pressed={magnified}
              aria-label={magnified ? t(locale, "shrink") : t(locale, "enlarge")}
              className={`block ${magnified ? "w-[200%] cursor-zoom-out" : "w-full cursor-zoom-in"}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.src}
                alt={active.alt || t(locale, "productPhoto")}
                className={
                  magnified
                    ? "h-auto w-full"
                    : "mx-auto max-h-[75vh] w-full object-contain"
                }
                decoding="async"
              />
            </button>
          </div>
          {images.length > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
                onClick={() => show(-1)}
              >
                {t(locale, "previousPhoto")}
              </button>
              <p className="text-sm text-muted-foreground">
                {index + 1} / {images.length}
              </p>
              <button
                type="button"
                className="text-sm underline-offset-4 hover:underline"
                onClick={() => show(1)}
              >
                {t(locale, "nextPhoto")}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {magnified ? t(locale, "tapShrink") : t(locale, "tapZoom")}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GalleryPlaceholder({ locale }: { locale: ShopLocale }) {
  return (
    <div className="flex aspect-square items-center justify-center rounded-2xl bg-muted/30 lg:sticky lg:top-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="h-36 w-24 rounded-full border border-foreground/10 bg-background" />
        <div>
          <p className="text-xs tracking-[0.32em] text-muted-foreground">ZERA</p>
          <p className="mt-2 text-sm text-muted-foreground">{t(locale, "photosPreparing")}</p>
        </div>
      </div>
    </div>
  );
}
