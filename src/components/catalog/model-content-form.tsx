"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { RichTextField } from "@/components/catalog/rich-text-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveModelContentAction } from "@/modules/catalog/content/actions";
import { slugifyModelName } from "@/modules/catalog/slug";
import type { DescriptiveSpec, PublicSpec } from "@/modules/catalog/content/specs";

type Props = {
  modelId: string;
  canManage: boolean;
  code: string;
  statusLabel: string;
  initial: {
    name: string;
    slug: string;
    slugCustomized: boolean;
    isPublished: boolean;
    shortDescription: string;
    descriptionSource: string;
    highlightsSource: string;
    careSource: string;
    warrantySource: string;
    deliverySource: string;
    extraSpecs: DescriptiveSpec[];
    seoTitle: string;
    seoDescription: string;
    primaryImageId: string | null;
    primaryAltText: string;
  };
  specs: PublicSpec[];
};

export function ModelContentForm({ modelId, canManage, code, statusLabel, initial, specs }: Props) {
  const [name, setName] = useState(initial.name);
  const [slug, setSlug] = useState(initial.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [shortDescription, setShortDescription] = useState(initial.shortDescription);
  const [descriptionSource, setDescriptionSource] = useState(initial.descriptionSource);
  const [highlightsSource, setHighlightsSource] = useState(initial.highlightsSource);
  const [careSource, setCareSource] = useState(initial.careSource);
  const [warrantySource, setWarrantySource] = useState(initial.warrantySource);
  const [deliverySource, setDeliverySource] = useState(initial.deliverySource);
  const [extraSpecs, setExtraSpecs] = useState<DescriptiveSpec[]>(initial.extraSpecs);
  const [seoTitle, setSeoTitle] = useState(initial.seoTitle);
  const [seoDescription, setSeoDescription] = useState(initial.seoDescription);
  const [primaryAltText, setPrimaryAltText] = useState(initial.primaryAltText);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState(false);

  const slugLocked = initial.slugCustomized || slugEdited || initial.isPublished;

  useEffect(() => {
    function onLeave(event: BeforeUnloadEvent) {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }
    function onClick(event: MouseEvent) {
      if (!dirty) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest("a");
      if (!anchor) {
        return;
      }
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }
      if (!window.confirm("Aveți modificări nesalvate. Părăsiți pagina?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    }
    window.addEventListener("beforeunload", onLeave);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onLeave);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  function mark() {
    setDirty(true);
  }

  function onName(value: string) {
    mark();
    setName(value);
    if (!slugLocked) {
      setSlug(slugifyModelName(value));
    }
  }

  const google = useMemo(() => {
    const title = seoTitle.trim() || name.trim() || "Fără titlu";
    const description =
      seoDescription.trim() ||
      shortDescription.trim() ||
      "Meta description nu este completată.";
    return { title, description, url: `/catalog/${slug || "slug"}` };
  }, [seoTitle, seoDescription, shortDescription, name, slug]);

  async function save() {
    setPending(true);
    const result = await saveModelContentAction({
      modelId,
      name,
      slug,
      slugEdited: initial.slugCustomized || slugEdited,
      shortDescription,
      descriptionSource,
      highlightsSource,
      careSource,
      warrantySource,
      deliverySource,
      extraSpecs,
      seoTitle,
      seoDescription,
      primaryImageId: initial.primaryImageId,
      primaryAltText,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    if (result.slug) {
      setSlug(result.slug);
    }
    setDirty(false);
    toast.success(result.message);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (canManage) {
          void save();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {code} · {statusLabel}
          {dirty ? " · Modificări nesalvate" : ""}
        </p>
        {canManage ? (
          <Button type="submit" disabled={pending}>
            {pending ? "Se salvează…" : "Salvează descrierea"}
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Vizualizare. Doar administratorul poate modifica.</p>
        )}
      </div>

      <Section title="Informații generale">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="commercial-name">Denumire comercială</Label>
            <Input
              id="commercial-name"
              value={name}
              disabled={!canManage}
              onChange={(event) => onName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="short-description">Descriere scurtă</Label>
            <Textarea
              id="short-description"
              value={shortDescription}
              disabled={!canManage}
              rows={3}
              maxLength={300}
              onChange={(event) => {
                mark();
                setShortDescription(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">{shortDescription.length}/300</p>
          </div>
        </div>
      </Section>

      <Section title="Descriere comercială">
        <RichTextField
          id="full-description"
          label="Descriere completă"
          value={descriptionSource}
          disabled={!canManage}
          hint="Titluri, paragrafe, liste, text evidențiat și linkuri. HTML-ul nu este salvat."
          onChange={(value) => {
            mark();
            setDescriptionSource(value);
          }}
        />
        <RichTextField
          id="highlights"
          label="Avantaje principale"
          value={highlightsSource}
          disabled={!canManage}
          onChange={(value) => {
            mark();
            setHighlightsSource(value);
          }}
        />
      </Section>

      <Section title="Specificații tehnice">
        <p className="text-sm text-muted-foreground">
          Valorile de mai jos vin din configurația și regulile modelului. Opțiunile ascunse sau
          nepermise nu sunt afișate. Grosimea sticlei nu este definită în configurator și nu este
          completată automat.
        </p>
        {specs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Configurația tehnică nu poate fi citită.</p>
        ) : (
          <dl className="divide-y divide-border rounded-xl border border-border">
            {specs.map((spec) => (
              <div key={spec.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[12rem_1fr]">
                <dt className="text-sm text-muted-foreground">{spec.label}</dt>
                <dd className="text-sm">
                  {spec.value}
                  {spec.options ? (
                    <span className="mt-1 block text-muted-foreground">{spec.options}</span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium">Specificații descriptive</h3>
            <p className="text-xs text-muted-foreground">
              Nu influențează prețul. Lăsați goale rândurile nefolosite.
            </p>
          </div>
          {extraSpecs.map((spec, index) => (
            <div key={spec.id} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <Input
                aria-label={`Etichetă specificație ${index + 1}`}
                value={spec.label}
                disabled={!canManage}
                placeholder="Etichetă, de exemplu Grosime sticlă"
                onChange={(event) => {
                  mark();
                  setExtraSpecs((current) =>
                    current.map((item) =>
                      item.id === spec.id ? { ...item, label: event.target.value } : item,
                    ),
                  );
                }}
              />
              <Input
                aria-label={`Valoare specificație ${index + 1}`}
                value={spec.value}
                disabled={!canManage}
                placeholder="Valoare"
                onChange={(event) => {
                  mark();
                  setExtraSpecs((current) =>
                    current.map((item) =>
                      item.id === spec.id ? { ...item, value: event.target.value } : item,
                    ),
                  );
                }}
              />
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    mark();
                    setExtraSpecs((current) => current.filter((item) => item.id !== spec.id));
                  }}
                >
                  Elimină
                </Button>
              ) : null}
            </div>
          ))}
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                mark();
                setExtraSpecs((current) => [
                  ...current,
                  { id: `extra-${Date.now()}`, label: "", value: "" },
                ]);
              }}
            >
              Adaugă specificație
            </Button>
          ) : null}
        </div>
      </Section>

      <Section title="Întreținere, garanție și livrare">
        <RichTextField
          id="care"
          label="Instrucțiuni de întreținere"
          value={careSource}
          disabled={!canManage}
          onChange={(value) => {
            mark();
            setCareSource(value);
          }}
        />
        <RichTextField
          id="warranty"
          label="Informații despre garanție"
          value={warrantySource}
          disabled={!canManage}
          hint="Nu se completează automat."
          onChange={(value) => {
            mark();
            setWarrantySource(value);
          }}
        />
        <RichTextField
          id="delivery"
          label="Informații despre producție și livrare"
          value={deliverySource}
          disabled={!canManage}
          hint="Nu se inventează termene."
          onChange={(value) => {
            mark();
            setDeliverySource(value);
          }}
        />
      </Section>

      <Section title="SEO">
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="seo-title">SEO title</Label>
            <Input
              id="seo-title"
              value={seoTitle}
              disabled={!canManage}
              maxLength={200}
              onChange={(event) => {
                mark();
                setSeoTitle(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {seoTitle.trim().length} caractere. În rezultate se văd de obicei în jur de 60.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="seo-description">Meta description</Label>
            <Textarea
              id="seo-description"
              value={seoDescription}
              disabled={!canManage}
              rows={3}
              maxLength={500}
              onChange={(event) => {
                mark();
                setSeoDescription(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {seoDescription.trim().length} caractere. În rezultate se văd de obicei în jur de 160.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="seo-slug">URL slug</Label>
            <Input
              id="seo-slug"
              value={slug}
              disabled={!canManage}
              onChange={(event) => {
                mark();
                setSlugEdited(true);
                setSlug(event.target.value);
              }}
            />
            <p className="text-xs text-muted-foreground">
              {initial.slugCustomized || slugEdited
                ? "Slug personalizat. Nu se mai actualizează din denumire."
                : "Generat din denumire până la prima editare manuală."}
              {initial.isPublished
                ? " La schimbarea unui slug publicat, adresa veche rămâne pentru redirecționare 301."
                : ""}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="primary-alt">Text alternativ pentru imaginea principală</Label>
            {initial.primaryImageId ? (
              <Input
                id="primary-alt"
                value={primaryAltText}
                disabled={!canManage}
                maxLength={300}
                onChange={(event) => {
                  mark();
                  setPrimaryAltText(event.target.value);
                }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                Nu există imagine principală.{" "}
                <Link href={`/admin/modele/${modelId}/fotografii`} className="underline underline-offset-2">
                  Adăugați una în Fotografii
                </Link>
                .
              </p>
            )}
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Previzualizare rezultat</p>
            <p className="mt-2 text-sm text-[#1a0dab]">{google.title}</p>
            <p className="text-xs text-[#006621]">{google.url}</p>
            <p className="mt-1 text-sm text-muted-foreground">{google.description}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Adresa publică este /catalog/{slug}. Modelul apare în magazin doar dacă este activ și publicat.
            </p>
          </div>
        </div>
      </Section>
    </form>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border p-4 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}
