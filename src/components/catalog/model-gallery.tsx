"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type GalleryImage = {
  id: string;
  kind: "SECONDARY" | "DETAIL" | "AMBIENT";
  isPrimary: boolean;
  sortOrder: number;
  altText: string;
  internalNote: string;
  widthPx: number;
  heightPx: number;
  thumbUrl: string;
  displayUrl: string;
};

const KIND_LABEL = {
  SECONDARY: "Secundară",
  DETAIL: "Detaliu",
  AMBIENT: "Ambientală",
} as const;

type Props = {
  modelId: string;
  initialImages: GalleryImage[];
  canManage: boolean;
};

export function ModelGallery({ modelId, initialImages, canManage }: Props) {
  const [images, setImages] = useState(initialImages);
  const [kind, setKind] = useState<GalleryImage["kind"]>("SECONDARY");
  const [altText, setAltText] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }
    setPending(true);
    setMessage(null);
    const form = new FormData();
    for (const file of files) {
      form.append("files", file);
    }
    form.set("kind", kind);
    form.set("altText", altText);
    form.set("internalNote", internalNote);
    const response = await fetch(`/api/admin/models/${modelId}/images`, {
      method: "POST",
      body: form,
    });
    const body = (await response.json()) as {
      images?: GalleryImage[];
      errors?: Array<{ fileName: string; message: string }>;
      message?: string;
    };
    setPending(false);
    if (body.images?.length) {
      setImages((current) => [...current, ...body.images!]);
      setAltText("");
      setInternalNote("");
    }
    if (body.errors?.length) {
      setMessage(body.errors.map((error) => `${error.fileName}: ${error.message}`).join(" "));
    } else if (!response.ok) {
      setMessage(body.message ?? "Încărcarea a eșuat.");
    }
  }

  async function saveMeta(image: GalleryImage, patch: Partial<GalleryImage>) {
    setMessage(null);
    const response = await fetch(`/api/admin/models/${modelId}/images/${image.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const body = (await response.json()) as { image?: GalleryImage; message?: string };
    if (!response.ok || !body.image) {
      setMessage(body.message ?? "Modificarea a eșuat.");
      return;
    }
    setImages((current) =>
      current.map((item) => {
        if (patch.isPrimary && item.id !== body.image!.id) {
          return { ...item, isPrimary: false };
        }
        return item.id === body.image!.id ? body.image! : item;
      }),
    );
  }

  async function remove(imageId: string) {
    setPending(true);
    setMessage(null);
    const response = await fetch(`/api/admin/models/${modelId}/images/${imageId}`, {
      method: "DELETE",
    });
    setPending(false);
    setPendingDeleteId(null);
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setMessage(body.message ?? "Ștergerea a eșuat.");
      return;
    }
    setImages((current) => {
      const next = current.filter((image) => image.id !== imageId);
      const removed = current.find((image) => image.id === imageId);
      if (removed?.isPrimary && next[0]) {
        next[0] = { ...next[0], isPrimary: true };
      }
      return next;
    });
  }

  async function persistOrder(next: GalleryImage[]) {
    setImages(next);
    const response = await fetch(`/api/admin/models/${modelId}/images/order`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((image) => image.id) }),
    });
    if (!response.ok) {
      const body = (await response.json()) as { message?: string };
      setMessage(body.message ?? "Ordinea nu a fost salvată.");
      setImages(images);
    }
  }

  function move(imageId: string, direction: -1 | 1) {
    const index = images.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= images.length) {
      return;
    }
    const next = images.slice();
    const [item] = next.splice(index, 1);
    next.splice(target, 0, item!);
    void persistOrder(next);
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) {
      return;
    }
    const next = images.slice();
    const from = next.findIndex((image) => image.id === dragId);
    const to = next.findIndex((image) => image.id === targetId);
    if (from < 0 || to < 0) {
      return;
    }
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item!);
    setDragId(null);
    void persistOrder(next);
  }

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Fotografii</h2>
        <p className="text-sm text-muted-foreground">
          JPEG, PNG sau WebP, maximum 10 MB. Imaginea principală este unică.
        </p>
      </div>

      {canManage ? (
        <form
          className="grid gap-3 rounded-2xl border border-dashed border-border p-4"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="photo-kind">Tip fotografie</Label>
              <select
                id="photo-kind"
                className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                value={kind}
                onChange={(event) => setKind(event.target.value as GalleryImage["kind"])}
              >
                <option value="SECONDARY">Secundară</option>
                <option value="DETAIL">Detaliu</option>
                <option value="AMBIENT">Ambientală</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="photo-alt">Text alternativ</Label>
              <Input
                id="photo-alt"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder="Descriere scurtă pentru accesibilitate"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="photo-note">Descriere internă</Label>
            <Textarea
              id="photo-note"
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              placeholder="Vizibilă doar în admin"
            />
          </div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl bg-muted/50 px-4 py-6 text-sm">
            <span className="font-medium">Încarcă imagini</span>
            <span className="text-muted-foreground">Puteți selecta mai multe fișiere</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="sr-only"
              disabled={pending}
              onChange={(event) => {
                void upload(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Vizualizare. Doar administratorul poate modifica galeria.
        </p>
      )}

      {message ? (
        <p className="text-sm text-destructive" role="alert">
          {message}
        </p>
      ) : null}

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Modelul nu are fotografii.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {images.map((image, index) => (
            <li
              key={image.id}
              draggable={canManage}
              onDragStart={() => setDragId(image.id)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOn(image.id)}
              className={`space-y-3 rounded-2xl border bg-card p-3 ${
                image.isPrimary ? "border-foreground" : "border-border"
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.displayUrl}
                  alt={image.altText || "Fotografie model"}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {image.isPrimary ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-background">
                    Principală
                  </span>
                ) : null}
                <span className="text-muted-foreground">{KIND_LABEL[image.kind]}</span>
                <span className="text-muted-foreground">
                  {image.widthPx}×{image.heightPx}
                </span>
              </div>
              {canManage ? (
                <>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`alt-${image.id}`}>Text alternativ</Label>
                    <Input
                      id={`alt-${image.id}`}
                      defaultValue={image.altText}
                      onBlur={(event) => {
                        if (event.target.value !== image.altText) {
                          void saveMeta(image, { altText: event.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`note-${image.id}`}>Descriere internă</Label>
                    <Textarea
                      id={`note-${image.id}`}
                      defaultValue={image.internalNote}
                      onBlur={(event) => {
                        if (event.target.value !== image.internalNote) {
                          void saveMeta(image, { internalNote: event.target.value });
                        }
                      }}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`kind-${image.id}`}>Tip</Label>
                    <select
                      id={`kind-${image.id}`}
                      className="h-10 rounded-lg border border-input bg-transparent px-3 text-sm"
                      value={image.kind}
                      onChange={(event) =>
                        void saveMeta(image, {
                          kind: event.target.value as GalleryImage["kind"],
                        })
                      }
                    >
                      <option value="SECONDARY">Secundară</option>
                      <option value="DETAIL">Detaliu</option>
                      <option value="AMBIENT">Ambientală</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!image.isPrimary ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void saveMeta(image, { isPrimary: true })}
                      >
                        Setează principală
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => move(image.id, -1)}
                      disabled={index === 0}
                    >
                      Sus
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => move(image.id, 1)}
                      disabled={index === images.length - 1}
                    >
                      Jos
                    </Button>
                    {pendingDeleteId === image.id ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={pending}
                          onClick={() => void remove(image.id)}
                        >
                          Confirmă ștergerea
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingDeleteId(null)}
                        >
                          Anulează
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingDeleteId(image.id)}
                      >
                        Șterge
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm">{image.altText || "Fără text alternativ"}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
