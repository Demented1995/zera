"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ORDER_BUTTON_LABEL,
  ORDER_FORM_NOTE,
  type PlaceOrderInput,
  type PlaceOrderResult,
} from "@/modules/orders/public";

type Props = {
  disabled: boolean;
  contextNote?: string;
  onPlace: (input: PlaceOrderInput) => Promise<PlaceOrderResult>;
};

export function OrderForm({ disabled, contextNote, onPlace }: Props) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (disabled || pending) {
      return;
    }
    setPending(true);
    setError(null);
    setMessage(null);
    const result = await onPlace({
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMessage(`Comanda ${result.number} a fost înregistrată.`);
    setName("");
    setPhone("");
    setAddress("");
  }

  return (
    <form className="space-y-3" onSubmit={submit}>
      <div className="grid gap-1.5">
        <Label htmlFor="order-name">Nume</Label>
        <Input
          id="order-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={disabled || pending}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-phone">Telefon</Label>
        <Input
          id="order-phone"
          name="tel"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          disabled={disabled || pending}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="order-address">Adresă de livrare</Label>
        <Textarea
          id="order-address"
          name="street-address"
          autoComplete="street-address"
          required
          minLength={5}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          disabled={disabled || pending}
        />
      </div>
      <Button type="submit" size="lg" className="w-full" disabled={disabled || pending}>
        {pending ? "Se înregistrează…" : ORDER_BUTTON_LABEL}
      </Button>
      <p id="order-form-note" className="text-xs leading-5 text-muted-foreground">
        {ORDER_FORM_NOTE}
      </p>
      {contextNote ? <p className="text-xs leading-5 text-muted-foreground">{contextNote}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
