"use client";

import Link from "next/link";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { useCart } from "@/components/shop/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMdl } from "@/modules/orders/public";
import { placeCartOrderAction } from "@/modules/shop/actions";
import { CART_MAX_QUANTITY, cartFormStartedAt, cartLineTotal, cartTotal, stableSelection } from "@/modules/shop/cart";

let checkoutSession: { signature: string; key: string } | null = null;

function checkoutSessionFor(signature: string): { signature: string; key: string } {
  if (!checkoutSession || checkoutSession.signature !== signature) {
    checkoutSession = { signature, key: crypto.randomUUID() };
  }
  return checkoutSession;
}

function noRememberedOrder(): null {
  return null;
}

const LAST_ORDER_KEY = "zera-last-order";
let rememberedOrder: string | null = null;
let rememberedHydrated = false;
const orderListeners = new Set<() => void>();

function readRememberedOrder(): string | null {
  if (!rememberedHydrated && typeof window !== "undefined") {
    rememberedOrder = window.sessionStorage.getItem(LAST_ORDER_KEY);
    rememberedHydrated = true;
  }
  return rememberedOrder;
}

function subscribeRememberedOrder(onStoreChange: () => void): () => void {
  orderListeners.add(onStoreChange);
  return () => orderListeners.delete(onStoreChange);
}

function rememberOrder(number: string): void {
  rememberedOrder = number;
  rememberedHydrated = true;
  window.sessionStorage.setItem(LAST_ORDER_KEY, number);
  for (const listener of orderListeners) {
    listener();
  }
}

export function CartView() {
  const cart = useCart();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [priceNotice, setPriceNotice] = useState<string | null>(null);
  const orderNumber = useSyncExternalStore(subscribeRememberedOrder, readRememberedOrder, noRememberedOrder);
  const signature = cart.lines
    .map((line) => `${line.id}:${line.quantity}:${stableSelection(line.selection)}`)
    .join("|");

  const total = cartTotal(cart.lines);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending || cart.lines.length === 0) {
      return;
    }
    setPending(true);
    setError(null);
    const checkout = checkoutSessionFor(signature);
    const result = await placeCartOrderAction({
      lines: cart.lines.map((line) => ({
        lineId: line.id,
        modelId: line.modelId,
        request: line.selection,
        quantity: line.quantity,
        expectedUnitPrice: line.unitPrice,
      })),
      customerName: name,
      customerPhone: phone,
      deliveryAddress: address,
      idempotencyKey: checkout.key,
      honeypot,
      startedAt: cartFormStartedAt(),
    });
    setPending(false);
    if (result.ok) {
      rememberOrder(result.number);
      setPriceNotice(null);
      cart.clear();
      return;
    }
    if (result.code === "PRICE_CHANGED") {
      cart.applyPrices(result.updates);
      setPriceNotice(result.message);
      return;
    }
    setError(result.message);
  }

  if (cart.lines.length === 0) {
    return (
      <div className="space-y-6">
        {orderNumber ? (
          <div className="space-y-2 rounded-xl border border-border p-6" role="status">
            <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Comandă plasată</p>
            <p className="text-3xl font-semibold tracking-tight">{orderNumber}</p>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Comanda are statusul Nouă. Nu este nevoie de cont. Plata online nu este disponibilă în
              această etapă.
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Coșul este gol.</p>
        )}
        <Link href="/catalog" className="text-sm underline-offset-4 hover:underline">
          Înapoi la catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.8fr)]">
      <ul className="divide-y divide-border border-y border-border">
        {cart.lines.map((line) => (
          <li key={line.id} className="grid gap-4 py-6 sm:grid-cols-[5rem_minmax(0,1fr)]">
            {line.imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={line.imageSrc}
                alt={line.imageAlt}
                className="h-20 w-20 rounded-md object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-md bg-muted" />
            )}
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/catalog/${line.slug}`} className="font-medium underline-offset-4 hover:underline">
                    {line.name}
                  </Link>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {line.summary.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm">{formatMdl(line.unitPrice)}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Label htmlFor={`qty-${line.id}`} className="text-sm text-muted-foreground">
                    Cantitate
                  </Label>
                  <Input
                    id={`qty-${line.id}`}
                    type="number"
                    min={1}
                    max={CART_MAX_QUANTITY}
                    value={line.quantity}
                    className="w-20"
                    onChange={(event) => cart.setQuantity(line.id, Number(event.target.value))}
                  />
                  <button
                    type="button"
                    className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                    onClick={() => cart.remove(line.id)}
                  >
                    Elimină
                  </button>
                </div>
                <p className="text-sm font-medium">{formatMdl(cartLineTotal(line.unitPrice, line.quantity))}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <form onSubmit={submit} className="space-y-5 rounded-xl border border-border p-5">
        <div>
          <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Total</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{formatMdl(total)}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Prețul este verificat pe server înainte de salvare. Nu este nevoie de cont sau parolă.
          </p>
        </div>
        {priceNotice ? (
          <p className="text-sm text-foreground" role="alert">
            {priceNotice}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="cart-name">Nume</Label>
          <Input id="cart-name" value={name} autoComplete="name" required onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cart-phone">Telefon</Label>
          <Input
            id="cart-phone"
            value={phone}
            autoComplete="tel"
            inputMode="tel"
            required
            onChange={(event) => setPhone(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cart-address">Adresă de livrare</Label>
          <Textarea
            id="cart-address"
            value={address}
            autoComplete="street-address"
            required
            rows={4}
            onChange={(event) => setAddress(event.target.value)}
          />
        </div>
        <div className="absolute -left-[9999px] h-px overflow-hidden" aria-hidden="true">
          <label htmlFor="cart-company">Companie</label>
          <input
            id="cart-company"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Se trimite…" : priceNotice ? "Confirmă comanda" : "Plasează comanda"}
        </Button>
      </form>
    </div>
  );
}
