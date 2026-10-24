"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CategoryOption = { id: string; name: string };

type Props = {
  q: string;
  status: string;
  categoryId: string;
  sort: string;
  order: string;
  categories: CategoryOption[];
};

export function ModelsFilters({
  q,
  status,
  categoryId,
  sort,
  order,
  categories,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [statusValue, setStatusValue] = useState(status);
  const [categoryValue, setCategoryValue] = useState(categoryId);
  const [sortValue, setSortValue] = useState(sort);
  const [orderValue, setOrderValue] = useState(order);

  function apply() {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (statusValue !== "ALL") {
      params.set("status", statusValue);
    }
    if (categoryValue !== "ALL") {
      params.set("categoryId", categoryValue);
    }
    params.set("sort", sortValue);
    params.set("order", orderValue);
    startTransition(() => {
      router.push(`/admin/modele?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-1.5">
        <Label>Căutare</Label>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cod, nume, slug…"
          className="w-56"
        />
      </div>
      <div className="grid gap-1.5">
        <Label>Status</Label>
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value)}
        >
          <option value="ALL">Toate</option>
          <option value="DRAFT">Ciornă</option>
          <option value="ACTIVE">Activ</option>
          <option value="ARCHIVED">Arhivat</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Categorie</Label>
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={categoryValue}
          onChange={(event) => setCategoryValue(event.target.value)}
        >
          <option value="ALL">Toate</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Sortare</Label>
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={sortValue}
          onChange={(event) => setSortValue(event.target.value)}
        >
          <option value="updatedAt">Data modificare</option>
          <option value="name">Nume</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label>Ordine</Label>
        <select
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={orderValue}
          onChange={(event) => setOrderValue(event.target.value)}
        >
          <option value="desc">Desc</option>
          <option value="asc">Asc</option>
        </select>
      </div>
      <Button type="button" disabled={pending} onClick={apply}>
        Aplică
      </Button>
    </div>
  );
}
