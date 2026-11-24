import type { ShopLocale } from "@/modules/shop/locale";
import { t } from "@/modules/shop/messages";

export type ShopContactLink = {
  id: "viber" | "whatsapp" | "telegram" | "phone";
  href: string;
  label: string;
  /** Visible text. Only the quick-call link shows the company phone. */
  text?: string;
};

/** Public header contacts. All four use the company phone already saved in settings. */
export function shopContactLinks(
  phone: string | null | undefined,
  locale: "ro" | "ru" = "ro",
): ShopContactLink[] {
  const display = (phone ?? "").trim();
  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) {
    return [];
  }
  return [
    {
      id: "viber",
      href: `viber://chat?number=%2B${digits}`,
      label: "Viber",
    },
    {
      id: "whatsapp",
      href: `https://wa.me/${digits}`,
      label: "WhatsApp",
    },
    {
      id: "telegram",
      href: `tg://resolve?phone=${digits}`,
      label: "Telegram",
    },
    {
      id: "phone",
      href: `tel:+${digits}`,
      label: locale === "ru" ? "Быстрый звонок" : "Apel rapid",
      text: display,
    },
  ];
}

/** Message a customer sends when asking about the mirror currently on screen. */
export function productQuestionText(
  locale: ShopLocale,
  name: string,
  widthMm: number | null,
  heightMm: number | null,
): string {
  const cleanName = name.trim();
  if (widthMm != null && heightMm != null && Number.isFinite(widthMm) && Number.isFinite(heightMm)) {
    const unit = locale === "ru" ? "мм" : "mm";
    return t(locale, "askMessageSized")
      .replace("{name}", cleanName)
      .replace("{size}", `${widthMm} × ${heightMm} ${unit}`);
  }
  return t(locale, "askMessage").replace("{name}", cleanName);
}

/**
 * Opens the company chat with the question already written.
 * WhatsApp and Viber put it in the message field. Telegram opens the same
 * company chat; its phone link cannot carry a draft.
 */
export function productQuestionLinks(
  phone: string | null | undefined,
  text: string,
): ShopContactLink[] {
  const digits = (phone ?? "").replace(/\D/g, "");
  const message = text.trim();
  if (digits.length < 8 || message.length === 0) {
    return [];
  }
  const encoded = encodeURIComponent(message);
  return [
    {
      id: "viber",
      href: `viber://chat?number=%2B${digits}&draft=${encoded}`,
      label: "Viber",
    },
    {
      id: "whatsapp",
      href: `https://wa.me/${digits}?text=${encoded}`,
      label: "WhatsApp",
    },
    {
      id: "telegram",
      href: `tg://resolve?phone=${digits}`,
      label: "Telegram",
    },
  ];
}
