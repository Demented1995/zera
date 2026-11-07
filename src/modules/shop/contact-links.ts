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
