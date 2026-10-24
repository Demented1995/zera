"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  linkOrderCustomerAction,
  setOrderAdvanceAction,
  setOrderStatusAction,
  unlinkOrderCustomerAction,
} from "@/modules/orders/actions";
import { ORDER_STATUS_LABEL, ORDER_STATUSES } from "@/modules/orders/public";
import type { OrderStatus } from "@prisma/client";

type Props = {
  orderId: string;
  status: OrderStatus;
  advanceAmount: number;
  linked: boolean;
};

export function OrderManage({ orderId, status, advanceAmount, linked }: Props) {
  const [pending, startTransition] = useTransition();
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [note, setNote] = useState("");
  const [advance, setAdvance] = useState(String(advanceAmount));
  const [customerCode, setCustomerCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setMessage(result.message);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => setOrderStatusAction({ orderId, status: nextStatus, note }));
        }}
      >
        <h2 className="text-sm font-medium">Status</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="next-status">Noul status</Label>
          <select
            id="next-status"
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm"
            value={nextStatus}
            onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
          >
            {ORDER_STATUSES.map((item) => (
              <option key={item} value={item}>
                {ORDER_STATUS_LABEL[item]}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="status-note">Notă</Label>
          <Input
            id="status-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Opțional"
          />
        </div>
        <Button type="submit" disabled={pending}>
          Salvează statusul
        </Button>
      </form>

      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          const amount = Number(advance.replace(",", "."));
          run(() => setOrderAdvanceAction({ orderId, advanceAmount: amount }));
        }}
      >
        <h2 className="text-sm font-medium">Avans</h2>
        <div className="grid gap-1.5">
          <Label htmlFor="advance">Sumă încasată, MDL</Label>
          <Input
            id="advance"
            inputMode="decimal"
            value={advance}
            onChange={(event) => setAdvance(event.target.value)}
          />
        </div>
        <Button type="submit" disabled={pending}>
          Salvează avansul
        </Button>
      </form>

      <form
        className="space-y-3 rounded-xl border border-border p-4"
        onSubmit={(event) => {
          event.preventDefault();
          run(() => linkOrderCustomerAction({ orderId, customerCode }));
        }}
      >
        <h2 className="text-sm font-medium">Client din registru</h2>
        <p className="text-xs leading-5 text-muted-foreground">
          Asocierea este manuală și nu modifică numele sau telefonul din comandă.
        </p>
        <div className="grid gap-1.5">
          <Label htmlFor="customer-code">Cod client</Label>
          <Input
            id="customer-code"
            value={customerCode}
            onChange={(event) => setCustomerCode(event.target.value)}
            placeholder="CLT-2026-0001"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>
            Asociază
          </Button>
          {linked ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => unlinkOrderCustomerAction(orderId))}
            >
              Elimină asocierea
            </Button>
          ) : null}
        </div>
      </form>

      {error ? (
        <p className="text-sm text-destructive lg:col-span-3" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm lg:col-span-3" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
