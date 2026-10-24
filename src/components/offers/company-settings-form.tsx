"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanySettingsAction } from "@/modules/offers/actions";

type Props = {
  initial: {
    legalName: string | null;
    taxId: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    bankDetails: string | null;
  };
};

export function CompanySettingsForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid max-w-xl gap-3 rounded-xl border border-border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await updateCompanySettingsAction({
            legalName: String(form.get("legalName") ?? "") || null,
            taxId: String(form.get("taxId") ?? "") || null,
            address: String(form.get("address") ?? "") || null,
            phone: String(form.get("phone") ?? "") || null,
            email: String(form.get("email") ?? "") || null,
            bankDetails: String(form.get("bankDetails") ?? "") || null,
          });
          if (!result.ok) {
            toast.error(result.message);
            return;
          }
          toast.success(result.message);
        });
      }}
    >
      <p className="text-sm text-muted-foreground">
        Date legale pentru PDF-ul ofertei. Câmpurile obligatorii la emitere:
        denumire, cod fiscal, adresă, telefon. Nu se inventează valori.
      </p>
      {(
        [
          ["legalName", "Denumire legală", initial.legalName],
          ["taxId", "Cod fiscal / IDNO", initial.taxId],
          ["address", "Adresă", initial.address],
          ["phone", "Telefon", initial.phone],
          ["email", "Email", initial.email],
        ] as const
      ).map(([name, label, value]) => (
        <div key={name} className="grid gap-1.5">
          <Label htmlFor={name}>{label}</Label>
          <Input id={name} name={name} defaultValue={value ?? ""} />
        </div>
      ))}
      <div className="grid gap-1.5">
        <Label htmlFor="bankDetails">Date bancare</Label>
        <Textarea
          id="bankDetails"
          name="bankDetails"
          defaultValue={initial.bankDetails ?? ""}
          rows={3}
        />
      </div>
      <Button type="submit" disabled={pending}>
        Salvează datele firmei
      </Button>
    </form>
  );
}
