"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { publishMirrorModelAction } from "@/modules/catalog/actions";

type Props = {
  id: string;
  published: boolean;
};

export function PublishModelButton({ id, published }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await publishMirrorModelAction({ id, publish: !published });
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
          router.refresh();
        });
      }}
    >
      {published ? "Retrage din magazin" : "Publică în magazin"}
    </Button>
  );
}
