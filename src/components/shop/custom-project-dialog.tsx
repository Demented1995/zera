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
import { Textarea } from "@/components/ui/textarea";
import { placeCustomProjectAction } from "@/modules/shop/project-actions";
import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";
import { localizePhrase } from "@/modules/shop/phrases";

export function CustomProjectDialog({ locale }: { locale: ShopLocale }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || sent) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await placeCustomProjectAction({
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
      message,
    });
    setPending(false);
    if (!result.ok) {
      setError(localizePhrase(locale, result.message));
      return;
    }
    setSent(true);
    setNotice(t(locale, "projectDone"));
  }

  return (
    <>
      <Button
        type="button"
        size="lg"
        className="bg-background text-foreground hover:bg-background/90"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        {t(locale, "contactUs")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md" closeLabel={t(locale, "close")}>
          <DialogHeader>
            <DialogTitle>{t(locale, "customProjectTitle")}</DialogTitle>
            <DialogDescription>{t(locale, "customProjectLead")}</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit}>
            <div className="grid gap-1.5">
              <Label htmlFor="project-name">{t(locale, "name")}</Label>
              <Input
                id="project-name"
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
              <Label htmlFor="project-phone">{t(locale, "phone")}</Label>
              <Input
                id="project-phone"
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
              <Label htmlFor="project-address">{t(locale, "addressOptional")}</Label>
              <Input
                id="project-address"
                name="address"
                autoComplete="street-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                disabled={pending || sent}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="project-message">{t(locale, "aboutProject")}</Label>
              <Textarea
                id="project-message"
                name="message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={pending || sent}
              />
            </div>
            {notice ? (
              <p className="text-sm font-medium text-green-700" role="status">
                {notice}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={pending || sent}>
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
