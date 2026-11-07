"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { LOCALE_COOKIE, type ShopLocale } from "@/modules/shop/locale";

export async function setShopLocaleAction(locale: ShopLocale): Promise<void> {
  const next = locale === "ru" ? "ru" : "ro";
  (await cookies()).set(LOCALE_COOKIE, next, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
