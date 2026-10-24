"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  archiveCustomerAction,
  linkCustomerOfferAction,
  unlinkCustomerOfferAction,
} from "@/modules/customers/actions";

export function ArchiveCustomerButton({
  id,
  archived,
}: {
  id: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    const next = !archived;
    if (next && !window.confirm("Arhivezi acest client? Ofertele asociate rămân neschimbate.")) {
      return;
    }
    startTransition(async () => {
      const result = await archiveCustomerAction({ id, archive: next });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={run}>
      {archived ? "Reactivează" : "Arhivează"}
    </Button>
  );
}

export function OfferLinkButton({
  customerId,
  offerId,
  linked,
}: {
  customerId: string;
  offerId: string;
  linked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const result = linked
        ? await unlinkCustomerOfferAction({ customerId, offerId })
        : await linkCustomerOfferAction({ customerId, offerId });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Button type="button" size="sm" variant="outline" disabled={pending} onClick={run}>
      {linked ? "Desparte" : "Asociază"}
    </Button>
  );
}

export function AssociateOfferForm({ customerId }: { customerId: string }) {
  const router = useRouter();
  const [number, setNumber] = useState("");
  const [pending, startTransition] = useTransition();

  function run() {
    const offerNumber = number.trim();
    if (!offerNumber) {
      return;
    }
    startTransition(async () => {
      const result = await linkCustomerOfferAction({ customerId, offerNumber });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setNumber("");
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        run();
      }}
    >
      <Input
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        placeholder="Număr ofertă, ex. OFT-2026-0001"
        aria-label="Număr ofertă"
        className="max-w-xs"
      />
      <Button type="submit" variant="outline" disabled={pending || !number.trim()}>
        Asociază oferta
      </Button>
    </form>
  );
}
