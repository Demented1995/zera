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

type Props = {
  images: PreviewGalleryImage[];
};

export function ProductGallery({ images }: Props) {
  const primaryIndex = Math.max(
    0,
    images.findIndex((image) => image.isPrimary),
  );
  const [index, setIndex] = useState(primaryIndex === -1 ? 0 : primaryIndex);
  const [zoomed, setZoomed] = useState(false);
  const active = images[index] ?? images[0];

  useEffect(() => {
    if (!zoomed) {
      return;
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "ArrowRight") {
        setIndex((current) => nextGalleryIndex(current, images.length, 1));
      }
      if (event.key === "ArrowLeft") {
        setIndex((current) => nextGalleryIndex(current, images.length, -1));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [images.length, zoomed]);

  if (!active) {
    return <GalleryPlaceholder />;
  }

  function step(direction: 1 | -1) {
    setIndex((current) => nextGalleryIndex(current, images.length, direction));
  }

  return (
    <div className="min-w-0 space-y-4 lg:sticky lg:top-6">
      <div className="relative flex aspect-[4/5] max-h-[70vh] items-center justify-center overflow-hidden rounded-2xl bg-muted/30">
        <button
          type="button"
          className="flex h-full w-full items-center justify-center"
          onClick={() => setZoomed(true)}
          aria-label="Mărește fotografia"
        >
          {/* Authenticated media route; next/image would not forward the staff session. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active.src}
            alt={active.alt || "Fotografia produsului"}
            className="h-full w-full object-contain"
            decoding="async"
            fetchPriority="high"
          />
        </button>
        {images.length > 1 ? (
          <>
            <GalleryStep label="Fotografia anterioară" onClick={() => step(-1)} side="left" />
            <GalleryStep label="Fotografia următoare" onClick={() => step(1)} side="right" />
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {images.map((image, imageIndex) => {
            const selected = image.id === active.id;
            return (
              <button
                key={image.id}
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={image.alt || `Fotografie ${imageIndex + 1}`}
                aria-pressed={selected}
                className={`aspect-square overflow-hidden rounded-lg border bg-muted/20 ${
                  selected ? "border-foreground" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.thumbSrc}
                  alt=""
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            );
          })}
        </div>
      ) : null}

      <Dialog open={zoomed} onOpenChange={setZoomed}>
        <DialogContent
          className="max-h-[calc(100%-2rem)] overflow-hidden bg-background p-3 sm:max-w-5xl"
        >
          <DialogTitle className="sr-only">Fotografie mărită</DialogTitle>
          <DialogDescription className="sr-only">
            {active.alt || "Fotografia produsului"}
          </DialogDescription>
          <div className="flex max-h-[80vh] items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.src}
              alt={active.alt || "Fotografia produsului"}
              className="max-h-[80vh] w-full object-contain"
              decoding="async"
            />
          </div>
          {images.length > 1 ? (
            <div className="flex justify-between gap-3">
              <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => step(-1)}>
                Anterioară
              </button>
              <button type="button" className="text-sm underline-offset-4 hover:underline" onClick={() => step(1)}>
                Următoare
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GalleryStep({
  label,
  onClick,
  side,
}: {
  label: string;
  onClick: () => void;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-lg shadow-sm ${
        side === "left" ? "left-3" : "right-3"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

function GalleryPlaceholder() {
  return (
    <div className="flex aspect-[4/5] max-h-[70vh] items-center justify-center rounded-2xl bg-muted/30 lg:sticky lg:top-6">
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="h-36 w-24 rounded-full border border-foreground/10 bg-background" />
        <div>
          <p className="text-xs tracking-[0.32em] text-muted-foreground">ZERA</p>
          <p className="mt-2 text-sm text-muted-foreground">Fotografii în curs de pregătire</p>
        </div>
      </div>
    </div>
  );
}
