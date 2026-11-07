"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { removeOrderMirrorAction } from "@/modules/orders/actions";

export function RemoveOrderMirror({
  orderId,
  mirrorKey,
  modelName,
}: {
  orderId: string;
  mirrorKey: string;
  modelName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Scoateți oglinda ${modelName} din comandă?`)) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await removeOrderMirrorAction({ orderId, mirrorKey });
            if (!result.ok) {
              setError(result.message);
              return;
            }
            router.push(`/admin/comenzi/${orderId}`);
            router.refresh();
          });
        }}
      >
        Scoate oglinda din comandă
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
