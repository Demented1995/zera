"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/modules/orders/public";

type Props = {
  q: string;
  status: string;
};

export function OrderFilters({ q, status }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(q);
  const [statusValue, setStatusValue] = useState(status);

  function apply() {
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    if (statusValue !== "ALL") {
      params.set("status", statusValue);
    }
    startTransition(() => {
      router.push(`/admin/comenzi?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
      <div className="grid min-w-56 flex-1 gap-1.5">
        <Label htmlFor="order-q">Căutare</Label>
        <Input
          id="order-q"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              apply();
            }
          }}
          placeholder="Număr, nume, telefon, model"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-status">Status</Label>
        <select
          id="order-status"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value)}
        >
          <option value="ALL">Toate</option>
          {ORDER_STATUSES.map((item) => (
            <option key={item} value={item}>
              {ORDER_STATUS_LABEL[item]}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" onClick={apply} disabled={pending}>
        Filtrează
      </Button>
    </div>
  );
}
