"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { ModelTechEditor } from "@/components/catalog/model-tech-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveMirrorModelAction } from "@/modules/catalog/actions";
import { slugifyModelName } from "@/modules/catalog/slug";
import type { ConfiguratorState } from "@/modules/configurator/map-to-engine";

type CategoryOption = { id: string; name: string };

type SavedConfigOption = {
  id: string;
  code: string;
  name: string;
};

type ModelFormProps = {
  categories: CategoryOption[];
  savedConfigs: SavedConfigOption[];
  canEditTariffs: boolean;
  canOverrideLedLength: boolean;
  initial?: {
    id: string;
    code: string;
    name: string;
    slug: string;
    shortDescription: string | null;
    fullDescription: string | null;
    categoryId: string;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    config: ConfiguratorState;
    sourceConfigurationId: string | null;
  } | null;
};

type TabId = "identity" | "tech" | "status";

export function ModelForm({
  categories,
  savedConfigs,
  canEditTariffs,
  canOverrideLedLength,
  initial = null,
}: ModelFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<TabId>("identity");
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [shortDescription, setShortDescription] = useState(
    initial?.shortDescription ?? "",
  );
  const [fullDescription, setFullDescription] = useState(
    initial?.fullDescription ?? "",
  );
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? categories[0]?.id ?? "",
  );
  const [status, setStatus] = useState<"DRAFT" | "ACTIVE" | "ARCHIVED">(
    initial?.status === "ARCHIVED" ? "ARCHIVED" : (initial?.status ?? "DRAFT"),
  );
  const [sourceConfigurationId, setSourceConfigurationId] = useState(
    initial?.sourceConfigurationId ?? "",
  );
  const [configPayload, setConfigPayload] = useState<Record<string, unknown>>(
    (initial?.config as unknown as Record<string, unknown>) ?? {},
  );
  const [dirty, setDirty] = useState(false);

  const tabs = useMemo(
    () =>
      [
        { id: "identity" as const, label: "Identitate" },
        { id: "tech" as const, label: "Config tehnică" },
        { id: "status" as const, label: "Status comercial" },
      ] as const,
    [],
  );

  function markDirty() {
    setDirty(true);
  }

  function onNameChange(value: string) {
    markDirty();
    setName(value);
    if (!slugTouched) {
      setSlug(slugifyModelName(value));
    }
  }

  function save() {
    if (!name.trim()) {
      toast.error("Introduceți numele comercial.");
      setTab("identity");
      return;
    }
    if (!categoryId) {
      toast.error("Selectați o categorie comercială.");
      setTab("identity");
      return;
    }
    if (!configPayload.shapeId) {
      toast.error("Completați configurația tehnică.");
      setTab("tech");
      return;
    }

    startTransition(async () => {
      const result = await saveMirrorModelAction({
        id: initial?.id,
        name: name.trim(),
        slug: slug.trim(),
        shortDescription: shortDescription.trim() || null,
        fullDescription: fullDescription.trim() || null,
        categoryId,
        status,
        config: configPayload,
        sourceConfigurationId: sourceConfigurationId || null,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDirty(false);
      if (result.id) {
        router.push(`/admin/modele/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {initial ? (
        <p className="text-sm text-muted-foreground">
          Cod intern: <span className="font-medium text-foreground">{initial.code}</span>
          {" · "}
          Publicare pe site: nu (pregătit pentru etape ulterioare)
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {tabs.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={tab === item.id ? "default" : "ghost"}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {tab === "identity" ? (
        <section className="grid max-w-2xl gap-4 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-2">
            <Label htmlFor="model-name">Nume comercial</Label>
            <Input
              id="model-name"
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              placeholder="ex. Alla"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-slug">Slug (URL public viitor)</Label>
            <Input
              id="model-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                markDirty();
                setSlug(event.target.value.toLowerCase());
              }}
              placeholder="alla"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-category">Categorie comercială</Label>
            <select
              id="model-category"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={categoryId}
              onChange={(event) => {
                markDirty();
                setCategoryId(event.target.value);
              }}
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <Link
              href="/admin/categorii"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Gestionează categorii
            </Link>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-short">Descriere scurtă</Label>
            <Input
              id="model-short"
              value={shortDescription}
              onChange={(event) => {
                markDirty();
                setShortDescription(event.target.value);
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="model-full">Descriere completă</Label>
            <textarea
              id="model-full"
              className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm"
              value={fullDescription}
              onChange={(event) => {
                markDirty();
                setFullDescription(event.target.value);
              }}
            />
          </div>
          {savedConfigs.length > 0 ? (
            <div className="grid gap-2">
              <Label htmlFor="from-config">Din configurație salvată (opțional)</Label>
              <select
                id="from-config"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={sourceConfigurationId}
                onChange={(event) => {
                  markDirty();
                  setSourceConfigurationId(event.target.value);
                }}
              >
                <option value="">—</option>
                {savedConfigs.map((config) => (
                  <option key={config.id} value={config.id}>
                    {config.code} — {config.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Legătură de proveniență. Configurația tehnică se editează în tab-ul
                Config tehnică (nu se creează un al doilea motor).
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === "tech" ? (
        <ModelTechEditor
          initialState={initial?.config ?? null}
          canEditTariffs={canEditTariffs}
          canOverrideLedLength={canOverrideLedLength}
          onChange={(payload) => {
            markDirty();
            setConfigPayload(payload);
          }}
        />
      ) : null}

      {tab === "status" ? (
        <section className="grid max-w-xl gap-4 rounded-xl border border-border bg-card p-5">
          <div className="grid gap-2">
            <Label htmlFor="model-status">Status comercial</Label>
            <select
              id="model-status"
              className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
              value={status}
              onChange={(event) => {
                markDirty();
                setStatus(event.target.value as typeof status);
              }}
            >
              <option value="DRAFT">Ciornă</option>
              <option value="ACTIVE">Activ</option>
              <option value="ARCHIVED">Arhivat</option>
            </select>
            <p className="text-xs text-muted-foreground">
              „Activ” ≠ publicat pe site. Activarea este blocată dacă calculul este
              incomplet sau configurația tehnică este invalidă.
            </p>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={pending} onClick={save}>
          {initial ? "Salvează modelul" : "Creează modelul"}
          {dirty ? " *" : ""}
        </Button>
        <Link
          href="/admin/modele"
          className="inline-flex h-8 items-center rounded-lg border border-border px-2.5 text-sm hover:bg-muted"
        >
          Înapoi la listă
        </Link>
      </div>
    </div>
  );
}
