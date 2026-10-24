"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  downloadOfferPdfAction,
  issueOfferAction,
} from "@/modules/offers/actions";

type OfferActionsProps = {
  offerId: string;
  canIssue: boolean;
};

export function OfferActions({ offerId, canIssue }: OfferActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function issue(createRevision: boolean) {
    startTransition(async () => {
      const result = await issueOfferAction({
        offerId,
        createRevision,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  function downloadPdf() {
    startTransition(async () => {
      const result = await downloadOfferPdfAction(offerId);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const binary = atob(result.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("PDF descărcat.");
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {canIssue ? (
        <Button type="button" disabled={pending} onClick={() => issue(false)}>
          Emite ofertă
        </Button>
      ) : (
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => issue(true)}
        >
          Emite revizie nouă
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={downloadPdf}
      >
        Descarcă PDF
      </Button>
    </div>
  );
}
