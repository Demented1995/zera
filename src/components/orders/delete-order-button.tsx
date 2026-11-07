"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { deleteOrderAction } from "@/modules/orders/actions";

export function DeleteOrderButton({
  orderId,
  number,
  appearance,
}: {
  orderId: string;
  number: string;
  appearance: "icon" | "text";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (
      !window.confirm(
        `Ștergeți comanda ${number}? Comanda dispare definitiv. Clientul și modelul rămân.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await deleteOrderAction(orderId);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      if (appearance === "text") {
        router.push("/admin/comenzi");
      }
      router.refresh();
    });
  }

  if (appearance === "icon") {
    return (
      <button
        type="button"
        aria-label={`Șterge ${number}`}
        title={error ?? `Șterge ${number}`}
        disabled={pending}
        onClick={remove}
        className="inline-flex size-6 items-center justify-center rounded bg-[#e03131] text-white disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="destructive" disabled={pending} onClick={remove}>
        Șterge comanda
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
