"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  q: string;
  status: string;
  sort: string;
  order: string;
};

export function ConfigurationsFilters({ q, status, sort, order }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [statusValue, setStatusValue] = useState(status);
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
    params.set("sort", sortValue);
    params.set("order", orderValue);
    startTransition(() => {
      router.push(`/admin/configuratii?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid gap-1.5">
        <Label>Căutare</Label>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cod, nume, formă…"
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
          <option value="COMPLETE">Completă</option>
          <option value="INCOMPLETE">Calcul incomplet</option>
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
          <option value="code">Cod</option>
          <option value="sinecost">Sinecost</option>
          <option value="retailPrice">Retail</option>
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
