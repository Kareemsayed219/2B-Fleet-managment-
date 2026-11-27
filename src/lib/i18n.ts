import "server-only";
import { cookies } from "next/headers";
import { ar } from "./dict/ar";
import { en } from "./dict/en";

export type Locale = "ar" | "en";
export type Dict = typeof en;

export const LOCALE_COOKIE = "locale";

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  return c === "en" ? "en" : "ar"; // Arabic is the default for drivers and runners.
}

export async function getDict(): Promise<{ locale: Locale; t: Dict; dir: "rtl" | "ltr" }> {
  const locale = await getLocale();
  return { locale, t: locale === "en" ? en : ar, dir: locale === "ar" ? "rtl" : "ltr" };
}
