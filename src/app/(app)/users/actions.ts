"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLogin } from "@/lib/supabase/create-login";
import { str, withError } from "@/lib/form";
import { loginToEmail, normalizePhone } from "@/lib/phone";
import { getDict } from "@/lib/i18n";

const ROLES = ["manager", "admin", "driver", "runner", "pending"];

export async function updateUser(formData: FormData) {
  const me = await requireManager();
  const id = str(formData, "id");
  const role = str(formData, "role");
  if (!id || !role || !ROLES.includes(role)) redirect("/users");
  if (id === me.id) redirect(withError("/users", "You cannot change your own role."));
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ role, active: formData.get("active") === "on" })
    .eq("id", id);
  if (error) redirect(withError("/users", error.message));
  revalidatePath("/users");
  redirect("/users?saved=1");
}

/** Manager creates an admin-team login (email, or phone for people without email). */
export async function createStaffLogin(formData: FormData) {
  await requireManager();
  const { t } = await getDict();
  const login = str(formData, "login");
  const password = str(formData, "password");
  const fullName = str(formData, "full_name") ?? "";
  if (!login || !password || password.length < 8) redirect(withError("/users", t.auth.passwordHint));
  const err = await createLogin({
    kind: "staff",
    email: loginToEmail(login),
    full_name: fullName,
    phone: login.includes("@") ? null : normalizePhone(login),
    password,
  });
  if (err) redirect(withError("/users", err));
  revalidatePath("/users");
  redirect("/users?saved=1");
}
