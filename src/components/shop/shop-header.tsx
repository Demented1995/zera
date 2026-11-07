"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { useCart } from "@/components/shop/cart-provider";
import type { ShopContactLink } from "@/modules/shop/contact-links";
import type { ShopLocale } from "@/modules/shop/locale";
import { setShopLocaleAction } from "@/modules/shop/locale-actions";
import { t } from "@/modules/shop/messages";

export function ShopHeader({
  contacts = [],
  locale = "ro",
}: {
  contacts?: ShopContactLink[];
  locale?: ShopLocale;
}) {
  const cart = useCart();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function chooseLocale(next: ShopLocale) {
    if (next === locale || pending) {
      return;
    }
    startTransition(async () => {
      await setShopLocaleAction(next);
      router.refresh();
    });
  }
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 w-full max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
        <Link href="/" className="text-sm tracking-[0.32em] uppercase">
          ZERA
        </Link>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/catalog" className="underline-offset-4 hover:underline">
              {t(locale, "catalog")}
            </Link>
            <Link href="/cos" className="underline-offset-4 hover:underline">
              {t(locale, "cart")}
              {cart.count > 0 ? ` (${cart.count})` : ""}
            </Link>
          </nav>
          <div className="flex items-center gap-1 text-xs">
            {(["ro", "ru"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={locale === item}
                disabled={pending}
                className={`rounded-full px-2 py-1 uppercase ${locale === item ? "bg-foreground text-background" : "text-muted-foreground"}`}
                onClick={() => chooseLocale(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {contacts.length > 0 ? (
            <div className="flex items-center gap-1.5">
              {contacts.map((contact) => (
                <a
                  key={contact.id}
                  href={contact.href}
                  aria-label={contact.text ? `${contact.label} ${contact.text}` : contact.label}
                  title={contact.text ? `${contact.label} ${contact.text}` : contact.label}
                  className={
                    contact.text
                      ? `inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-sm text-white ${contactTone[contact.id]}`
                      : `inline-flex size-8 items-center justify-center rounded-full text-white ${contactTone[contact.id]}`
                  }
                  {...(contact.href.startsWith("http")
                    ? { target: "_blank", rel: "noreferrer" }
                    : {})}
                >
                  <ContactIcon id={contact.id} />
                  {contact.text ? <span className="pr-0.5">{contact.text}</span> : null}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const contactTone: Record<ShopContactLink["id"], string> = {
  viber: "bg-[#7360F2]",
  whatsapp: "bg-[#25D366]",
  telegram: "bg-[#2AABEE]",
  phone: "bg-foreground",
};

function PhoneGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.1 3.6c.4-.4 1-.5 1.5-.2l1.8.9c.5.2.8.7.7 1.3l-.4 2.2c0 .5-.3.9-.8 1.1L8.8 9.4a11.2 11.2 0 0 0 5.8 5.8l.5-1.1c.2-.4.6-.7 1.1-.8l2.2-.4c.5-.1 1.1.2 1.3.7l.9 1.8c.3.5.2 1.1-.2 1.5l-1.5 1.4c-.4.4-1 .6-1.6.5-6.2-.8-11.1-5.7-11.9-11.9-.1-.6.1-1.2.5-1.6l1.2-1.5z"
      />
    </svg>
  );
}

function ContactIcon({ id }: { id: ShopContactLink["id"] }) {
  if (id === "whatsapp") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M12.04 3.2A8.3 8.3 0 0 0 3.8 11.4c0 1.46.38 2.88 1.1 4.13L3.7 20.3l4.9-1.16a8.4 8.4 0 0 0 3.44.74h.01a8.3 8.3 0 0 0 0-16.68zm4.84 11.72c-.2.57-1.17 1.04-1.62 1.11-.42.06-.94.09-1.52-.1-.35-.1-.8-.25-1.38-.5-2.42-1.05-4-3.48-4.12-3.64-.12-.16-.98-1.3-.98-2.48 0-1.18.62-1.76.84-2 .2-.22.54-.33.86-.33h.62c.2 0 .46-.08.71.54.26.64.89 2.21.97 2.37.08.16.13.35.02.56-.1.21-.15.34-.3.52-.15.18-.31.4-.45.53-.15.15-.3.31-.13.61.18.3.78 1.29 1.68 2.09 1.15 1.03 2.13 1.35 2.43 1.5.3.15.48.13.66-.08.18-.2.76-.88.96-1.19.2-.3.4-.25.67-.15.28.1 1.74.82 2.04.97.3.15.5.22.57.35.08.12.08.72-.12 1.29z"
        />
      </svg>
    );
  }
  if (id === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
        <path
          fill="currentColor"
          d="M20.7 4.7 3.4 11.3c-1.2.46-1.18 1.1-.22 1.38l4.45 1.39 1.72 5.28c.21.64.1.9.74.9.47 0 .68-.22.94-.48l2.5-2.43 4.55 3.36c.84.46 1.44.22 1.65-.78l2.86-13.48c.28-1.22-.46-1.77-1.29-1.44zM8.7 14.2l8.9-5.6c.44-.27.85-.12.52.17l-7.6 6.86-.3 3.2-1.52-4.63z"
        />
      </svg>
    );
  }
  return <PhoneGlyph />;
}

