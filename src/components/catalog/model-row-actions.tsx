"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  archiveMirrorModelAction,
  duplicateMirrorModelAction,
} from "@/modules/catalog/actions";

type Props = {
  id: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  canManage: boolean;
};

export function ModelRowActions({ id, status, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function duplicate() {
    startTransition(async () => {
      const result = await duplicateMirrorModelAction({ id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id) {
        router.push(`/admin/modele/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  function toggleArchive() {
    startTransition(async () => {
      const result = await archiveMirrorModelAction({
        id,
        archive: status !== "ARCHIVED",
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/admin/modele/${id}`}
        className="text-sm underline-offset-2 hover:underline"
      >
        {canManage ? "Editează" : "Vezi"}
      </Link>
      <Link
        href={`/admin/modele/${id}/previzualizare`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Previzualizează ca client
      </Link>
      <Link
        href={`/admin/configurator?modelId=${id}`}
        className="text-sm text-muted-foreground underline-offset-2 hover:underline"
      >
        Deschide în configurator
      </Link>
      {canManage ? (
        <>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={duplicate}
          >
            Duplică
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={toggleArchive}
          >
            {status === "ARCHIVED" ? "Reactivează" : "Arhivează"}
          </Button>
        </>
      ) : null}
    </div>
  );
}
