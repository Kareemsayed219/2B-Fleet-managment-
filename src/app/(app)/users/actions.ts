"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireManager } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const admin = createAdminClient();
  if (!admin) redirect(withError("/users", t.driver.serviceKeyMissing));
  const { data, error } = await admin.auth.admin.createUser({
    email: loginToEmail(login),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: login.includes("@") ? null : normalizePhone(login) },
  });
  if (error || !data.user) redirect(withError("/users", error?.message ?? t.common.error));
  const { error: pErr } = await admin.from("profiles").update({ role: "admin", active: true }).eq("id", data.user.id);
  if (pErr) redirect(withError("/users", pErr.message));
  revalidatePath("/users");
  redirect("/users?saved=1");
}
