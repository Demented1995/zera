"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import {
  archiveMirrorModelAction,
  deleteMirrorModelAction,
  duplicateMirrorModelAction,
} from "@/modules/catalog/actions";

type Props = {
  id: string;
  name: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  canManage: boolean;
};

export function ModelRowActions({ id, name, status, canManage }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

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

  function remove() {
    startTransition(async () => {
      const result = await deleteMirrorModelAction(id);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setConfirmDelete(false);
      router.refresh();
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
        href={`/admin/modele/${id}/descriere`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Descriere
      </Link>
      <Link
        href={`/admin/modele/${id}/fotografii`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Fotografii
      </Link>
      <Link
        href={`/admin/modele/${id}/produs`}
        className="text-sm underline-offset-2 hover:underline"
      >
        Previzualizează produsul
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
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() => setConfirmDelete(true)}
          >
            Elimină
          </Button>
          <ConfirmDialog
            open={confirmDelete}
            onOpenChange={setConfirmDelete}
            title="Eliminați modelul?"
            description={`„${name}” dispare din catalog. Comenzile deja plasate își păstrează prețul și configurația.`}
            confirmLabel="Elimină"
            destructive
            pending={pending}
            onConfirm={remove}
          />
        </>
      ) : null}
    </div>
  );
}
