import { cookies } from "next/headers";

export type ShopLocale = "ro" | "ru";

export const LOCALE_COOKIE = "zera-locale";

export async function getShopLocale(): Promise<ShopLocale> {
  try {
    const value = (await cookies()).get(LOCALE_COOKIE)?.value;
    return value === "ru" ? "ru" : "ro";
  } catch {
    return "ro";
  }
}
