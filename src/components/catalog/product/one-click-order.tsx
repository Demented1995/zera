"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OneClickOrderInput, PlaceOrderResult } from "@/modules/orders/public";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";
import { localizePhrase } from "@/modules/shop/phrases";

type Props = {
  disabled: boolean;
  onPlace: (input: OneClickOrderInput) => Promise<PlaceOrderResult>;
  locale?: ShopLocale;
};

export function OneClickOrder({ disabled, onPlace, locale = "ro" }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || pending || sent) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await onPlace({
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
    });
    setPending(false);
    if (!result.ok) {
      setError(localizePhrase(locale, result.message));
      return;
    }
    setSent(true);
    setMessage(t(locale, "oneClickDone").replace("{number}", result.number));
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t(locale, "buyOneClick")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent closeLabel={t(locale, "close")}>
          <DialogHeader>
            <DialogTitle>{t(locale, "buyOneClick")}</DialogTitle>
            <DialogDescription>{t(locale, "oneClickLead")}</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="grid gap-1.5">
              <Label htmlFor="one-click-name">{t(locale, "name")}</Label>
              <Input
                id="one-click-name"
                name="name"
                autoComplete="name"
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={pending || sent}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="one-click-phone">{t(locale, "phone")}</Label>
              <Input
                id="one-click-phone"
                name="tel"
                type="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                disabled={pending || sent}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="one-click-address">{t(locale, "addressOptional")}</Label>
              <Input
                id="one-click-address"
                name="address"
                autoComplete="street-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={pending || sent}
              />
            </div>
            {message ? (
              <p className="text-sm font-medium text-green-700" role="status">
                {message}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={disabled || pending || sent}>
              {pending ? t(locale, "sending") : t(locale, "send")}
            </Button>
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
