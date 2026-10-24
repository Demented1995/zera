"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { duplicateConfigurationAction } from "@/modules/offers/actions";

export function ConfigRowActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-1">
      <Link
        href={`/admin/configurator?id=${id}`}
        className="inline-flex h-6 items-center rounded-lg border border-border px-2 text-xs hover:bg-muted"
      >
        Deschide
      </Link>
      <Button
        size="xs"
        variant="ghost"
        disabled={pending}
        onClick={() => {
          startTransition(async () => {
            const result = await duplicateConfigurationAction({ id });
            if (!result.ok) {
              toast.error(result.message);
              return;
            }
            toast.success(result.message);
            if (result.id) {
              router.push(`/admin/configurator?id=${result.id}`);
            } else {
              router.refresh();
            }
          });
        }}
      >
        Duplică
      </Button>
    </div>
  );
}
