"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { sendSiteRequestToProductionAction } from "@/modules/orders/actions";

export function SendToProductionButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await sendSiteRequestToProductionAction(orderId);
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.push(`/admin/comenzi/${orderId}`);
            router.refresh();
          });
        }}
      >
        {pending ? "Se trimite…" : "Trimite la producere"}
      </Button>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
