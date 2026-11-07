"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  saveHomepageCategoriesAction,
  saveMirrorCategoryAction,
} from "@/modules/catalog/actions";
import { slugifyModelName } from "@/modules/catalog/slug";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  nameRu: string | null;
  descriptionRu: string | null;
  sortOrder: number;
  isActive: boolean;
  featuredOnHome: boolean;
  homeSortOrder: number;
  homeCaption: string | null;
  homeCaptionRu: string | null;
  _count?: { models: number };
};

type Props = {
  categories: CategoryRow[];
  canManage: boolean;
};

export function CategoriesManager({ categories, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [descriptionRu, setDescriptionRu] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setNameRu("");
    setDescriptionRu("");
    setSortOrder("0");
    setIsActive(true);
    setSlugTouched(false);
  }

  function startEdit(row: CategoryRow) {
    setEditingId(row.id);
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
    setNameRu(row.nameRu ?? "");
    setDescriptionRu(row.descriptionRu ?? "");
    setSortOrder(String(row.sortOrder));
    setIsActive(row.isActive);
    setSlugTouched(true);
  }

  function save() {
    startTransition(async () => {
      const result = await saveMirrorCategoryAction({
        id: editingId ?? undefined,
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        nameRu: nameRu.trim() || null,
        descriptionRu: descriptionRu.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        isActive,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      resetForm();
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <HomepageCategoryPicker categories={categories} canManage={canManage} />
      {canManage ? (
        <section className="grid max-w-xl gap-3 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">
            {editingId ? "Editează categoria" : "Categorie nouă"}
          </h2>
          <div className="grid gap-2">
            <Label>Nume</Label>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) {
                  setSlug(slugifyModelName(event.target.value));
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value.toLowerCase());
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Nume în rusă</Label>
            <Input value={nameRu} onChange={(event) => setNameRu(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Descriere</Label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label>Descriere în rusă</Label>
            <Input value={descriptionRu} onChange={(event) => setDescriptionRu(event.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Ordine</Label>
              <Input
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Activă
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="button" disabled={pending} onClick={save}>
              {editingId ? "Actualizează" : "Adaugă"}
            </Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>
                Anulează
              </Button>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="text-sm text-muted-foreground">
          Doar ADMIN poate modifica structura catalogului comercial.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nume</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Ordine</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Modele</TableHead>
              {canManage ? <TableHead>Acțiuni</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canManage ? 6 : 5}
                  className="text-muted-foreground"
                >
                  Nicio categorie comercială.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.slug}</TableCell>
                  <TableCell>{row.sortOrder}</TableCell>
                  <TableCell>{row.isActive ? "Activă" : "Inactivă"}</TableCell>
                  <TableCell>{row._count?.models ?? 0}</TableCell>
                  {canManage ? (
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => startEdit(row)}
                      >
                        Editează
                      </Button>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function HomepageCategoryPicker({
  categories,
  canManage,
}: {
  categories: CategoryRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(() =>
    categories
      .filter((category) => category.isActive)
      .map((category) => ({
        id: category.id,
        name: category.name,
        featured: category.featuredOnHome,
        order: String(category.homeSortOrder),
        caption: category.homeCaption ?? "",
        captionRu: category.homeCaptionRu ?? "",
      })),
  );
  const selected = rows.filter((row) => row.featured).length;

  function save() {
    startTransition(async () => {
      const result = await saveHomepageCategoriesAction({
        items: rows.map((row) => ({
          id: row.id,
          featured: row.featured,
          order: Number(row.order) || 0,
          caption: row.caption,
          captionRu: row.captionRu,
        })),
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nu există categorii active de afișat pe pagina principală.
      </p>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div>
        <h2 className="text-sm font-semibold">Pagina principală</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Alege până la 4 categorii. Ele apar la centru, în ordinea introdusă. Linia scurtă este
          opțională. Fotografia este a unui model publicat din categorie.
        </p>
      </div>
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-[auto_1fr_90px]">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                disabled={!canManage}
                checked={row.featured}
                onChange={(event) => {
                  const featured = event.target.checked;
                  setRows((current) =>
                    current.map((item, itemIndex) =>
                      itemIndex === index ? { ...item, featured } : item,
                    ),
                  );
                }}
              />
              {row.name}
            </label>
            <div className="grid gap-2">
            <Input
              value={row.caption}
              disabled={!canManage || !row.featured}
              placeholder="Linie scurtă, română"
              maxLength={80}
              onChange={(event) => {
                const caption = event.target.value;
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, caption } : item,
                  ),
                );
              }}
            />
            <Input
              value={row.captionRu}
              disabled={!canManage || !row.featured}
              placeholder="Короткая строка, русский"
              maxLength={80}
              onChange={(event) => {
                const captionRu = event.target.value;
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, captionRu } : item,
                  ),
                );
              }}
            />
            </div>
            <Input
              value={row.order}
              disabled={!canManage || !row.featured}
              inputMode="numeric"
              aria-label={`Ordine ${row.name}`}
              onChange={(event) => {
                const order = event.target.value;
                setRows((current) =>
                  current.map((item, itemIndex) =>
                    itemIndex === index ? { ...item, order } : item,
                  ),
                );
              }}
            />
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        {canManage ? (
          <Button type="button" disabled={pending} onClick={save}>
            {pending ? "Se salvează…" : "Salvează pagina principală"}
          </Button>
        ) : null}
        <p className="text-sm text-muted-foreground">{selected} din 4 selectate</p>
      </div>
    </section>
  );
}
