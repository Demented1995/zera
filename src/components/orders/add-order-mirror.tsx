"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { addOrderMirrorAction } from "@/modules/orders/actions";

export function AddOrderMirror({
  orderId,
  models,
}: {
  orderId: string;
  models: Array<{ id: string; name: string; code: string }>;
}) {
  const router = useRouter();
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (models.length === 0) {
    return <p className="text-sm text-muted-foreground">Nu există un model publicat pe care să îl adăugați.</p>;
  }

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setMessage(null);
        startTransition(async () => {
          const result = await addOrderMirrorAction({ orderId, modelId });
          if (!result.ok) {
            setError(result.message);
            return;
          }
          setMessage(result.message);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="oglinda-model">Model</Label>
        <select
          id="oglinda-model"
          className="h-8 min-w-56 rounded-lg border border-input bg-transparent px-2.5 text-sm"
          value={modelId}
          onChange={(event) => setModelId(event.target.value)}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} · {model.code}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending || !modelId}>
        Adaugă oglinda
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </form>
  );
}
