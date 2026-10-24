"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveCustomerAction } from "@/modules/customers/actions";
import type { CustomerAddressDraft, CustomerFormValues } from "@/modules/customers/form-values";

const emptyAddress = (): CustomerAddressDraft => ({
  label: "",
  line: "",
  city: "",
  postalCode: "",
  isPrimary: false,
});

const selectClass =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm";

export function CustomerForm({ initial }: { initial: CustomerFormValues }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);

  function patch<K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function patchAddress(index: number, next: Partial<CustomerAddressDraft>) {
    setValues((current) => ({
      ...current,
      addresses: current.addresses.map((address, addressIndex) => {
        if (addressIndex !== index) {
          return next.isPrimary ? { ...address, isPrimary: false } : address;
        }
        return { ...address, ...next };
      }),
    }));
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveCustomerAction(values);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      toast.success(result.message);
      if (result.id) {
        router.push(`/admin/clienti/${result.id}`);
        router.refresh();
      }
    });
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-medium">Informații generale</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="customer-kind">Tip client</Label>
            <select
              id="customer-kind"
              className={selectClass}
              value={values.kind}
              onChange={(event) =>
                patch("kind", event.target.value === "COMPANY" ? "COMPANY" : "INDIVIDUAL")
              }
            >
              <option value="INDIVIDUAL">Persoană fizică</option>
              <option value="COMPANY">Persoană juridică</option>
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-name">Nume</Label>
            <Input
              id="customer-name"
              value={values.displayName}
              onChange={(event) => patch("displayName", event.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-phone">Telefon</Label>
            <Input
              id="customer-phone"
              value={values.phone}
              onChange={(event) => patch("phone", event.target.value)}
              required
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-email">Email</Label>
            <Input
              id="customer-email"
              type="email"
              value={values.email}
              onChange={(event) => patch("email", event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-company">Companie</Label>
            <Input
              id="customer-company"
              value={values.companyName}
              onChange={(event) => patch("companyName", event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="customer-idno">IDNO</Label>
            <Input
              id="customer-idno"
              value={values.idno}
              onChange={(event) => patch("idno", event.target.value)}
              inputMode="numeric"
            />
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="customer-contact">Persoană de contact</Label>
            <Input
              id="customer-contact"
              value={values.contactName}
              onChange={(event) => patch("contactName", event.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Pentru o persoană juridică, denumirea companiei este obligatorie. IDNO, dacă este
          completat, trebuie să aibă 13 cifre.
        </p>
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Adrese</h2>
          <Button
            type="button"
            variant="outline"
            disabled={values.addresses.length >= 8}
            onClick={() =>
              patch("addresses", [
                ...values.addresses,
                { ...emptyAddress(), isPrimary: values.addresses.length === 0 },
              ])
            }
          >
            Adaugă adresă
          </Button>
        </div>
        {values.addresses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nicio adresă salvată.</p>
        ) : (
          <div className="space-y-4">
            {values.addresses.map((address, index) => (
              <div key={index} className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor={`address-label-${index}`}>Etichetă</Label>
                  <Input
                    id={`address-label-${index}`}
                    value={address.label}
                    placeholder="Sediu, livrare"
                    onChange={(event) => patchAddress(index, { label: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`address-line-${index}`}>Adresă</Label>
                  <Input
                    id={`address-line-${index}`}
                    value={address.line}
                    onChange={(event) => patchAddress(index, { line: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`address-city-${index}`}>Localitate</Label>
                  <Input
                    id={`address-city-${index}`}
                    value={address.city}
                    onChange={(event) => patchAddress(index, { city: event.target.value })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor={`address-postal-${index}`}>Cod poștal</Label>
                  <Input
                    id={`address-postal-${index}`}
                    value={address.postalCode}
                    onChange={(event) => patchAddress(index, { postalCode: event.target.value })}
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-foreground"
                    checked={address.isPrimary}
                    onChange={(event) => patchAddress(index, { isPrimary: event.target.checked })}
                  />
                  Adresă principală
                </label>
                <div className="sm:text-right">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() =>
                      patch(
                        "addresses",
                        values.addresses.filter((_, addressIndex) => addressIndex !== index),
                      )
                    }
                  >
                    Elimină
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-4 sm:p-5">
        <h2 className="text-sm font-medium">Observații interne</h2>
        <Textarea
          value={values.notes}
          onChange={(event) => patch("notes", event.target.value)}
          rows={4}
          aria-label="Observații interne"
        />
        <p className="text-xs text-muted-foreground">
          Vizibile doar în admin. Nu sunt copiate pe oferte.
        </p>
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? "Se salvează…" : "Salvează clientul"}
      </Button>
    </form>
  );
}
