"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  q: string;
  kind: string;
  status: string;
  sort: string;
  order: string;
};

export function CustomerFilters({ q, kind, status, sort, order }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [kindValue, setKindValue] = useState(kind);
  const [statusValue, setStatusValue] = useState(status);
  const [sortValue, setSortValue] = useState(sort);
  const [orderValue, setOrderValue] = useState(order);

  function apply() {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (kindValue !== "ALL") {
      params.set("kind", kindValue);
    }
    if (statusValue !== "ACTIVE") {
      params.set("status", statusValue);
    }
    params.set("sort", sortValue);
    params.set("order", orderValue);
    startTransition(() => {
      router.push(`/admin/clienti?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid min-w-56 flex-1 gap-1.5">
        <Label htmlFor="customer-q">Căutare</Label>
        <Input
          id="customer-q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              apply();
            }
          }}
          placeholder="Nume, telefon, email, IDNO, cod"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="customer-kind">Tip</Label>
        <select
          id="customer-kind"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={kindValue}
          onChange={(event) => setKindValue(event.target.value)}
        >
          <option value="ALL">Toți</option>
          <option value="INDIVIDUAL">Persoane fizice</option>
          <option value="COMPANY">Persoane juridice</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="customer-status">Stare</Label>
        <select
          id="customer-status"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value)}
        >
          <option value="ACTIVE">Activi</option>
          <option value="ARCHIVED">Arhivați</option>
          <option value="ALL">Toți</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="customer-sort">Sortare</Label>
        <select
          id="customer-sort"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={sortValue}
          onChange={(event) => setSortValue(event.target.value)}
        >
          <option value="updatedAt">Modificați</option>
          <option value="displayName">Nume</option>
          <option value="createdAt">Adăugați</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="customer-order">Ordine</Label>
        <select
          id="customer-order"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={orderValue}
          onChange={(event) => setOrderValue(event.target.value)}
        >
          <option value="desc">Descrescător</option>
          <option value="asc">Crescător</option>
        </select>
      </div>
      <Button type="button" disabled={pending} onClick={apply}>
        Aplică
      </Button>
    </div>
  );
}
