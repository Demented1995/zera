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
import { saveMirrorCategoryAction } from "@/modules/catalog/actions";
import { slugifyModelName } from "@/modules/catalog/slug";

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
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
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setSlug("");
    setDescription("");
    setSortOrder("0");
    setIsActive(true);
    setSlugTouched(false);
  }

  function startEdit(row: CategoryRow) {
    setEditingId(row.id);
    setName(row.name);
    setSlug(row.slug);
    setDescription(row.description ?? "");
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
            <Label>Descriere</Label>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
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
