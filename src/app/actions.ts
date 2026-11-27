"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { loginToEmail } from "@/lib/phone";
import { str, withError } from "@/lib/form";

export async function toggleLocale(formData: FormData) {
  const current = (await cookies()).get(LOCALE_COOKIE)?.value === "en" ? "en" : "ar";
  const next = current === "en" ? "ar" : "en";
  (await cookies()).set(LOCALE_COOKIE, next, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  let back = str(formData, "back");
  const referer = (await headers()).get("referer");
  if (!back && referer) {
    try {
      const u = new URL(referer);
      back = u.pathname + u.search;
    } catch {}
  }
  redirect(back && back.startsWith("/") && !back.startsWith("//") ? back : "/");
}

export async function signIn(formData: FormData) {
  const login = str(formData, "login");
  const password = str(formData, "password");
  if (!login || !password) redirect("/login?failed=1");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: loginToEmail(login), password });
  if (error) redirect("/login?failed=1");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setupManager(formData: FormData) {
  const supabase = await createClient();
  const { data: needs } = await supabase.rpc("needs_setup");
  if (!needs) redirect("/login");
  const email = str(formData, "email");
  const password = str(formData, "password");
  const fullName = str(formData, "full_name") ?? "";
  if (!email || !password || password.length < 8) redirect(withError("/setup", "Email and an 8+ character password are required."));
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) redirect(withError("/setup", error.message));
  // If email confirmation is on, signUp returns no session; the user then confirms and signs in.
  const { data } = await supabase.auth.getClaims();
  redirect(data?.claims?.sub ? "/" : "/login?confirm=1");
}
