"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createLogin } from "@/lib/supabase/create-login";
import { friendlyDbError, str, withError } from "@/lib/form";
import { normalizePhone } from "@/lib/phone";
import { parseSheet } from "@/lib/sheet";
import { getDict } from "@/lib/i18n";

function driverFromForm(fd: FormData) {
  return {
    full_name: str(fd, "full_name"),
    phone: normalizePhone(str(fd, "phone") ?? ""),
    kind: str(fd, "kind") === "runner" ? "runner" : "driver",
    national_id: str(fd, "national_id"),
    license_class: str(fd, "license_class"),
    license_expiry: str(fd, "license_expiry"),
    status: str(fd, "status") === "inactive" ? "inactive" : "active",
    notes: str(fd, "notes"),
  };
}

export async function saveDriver(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const id = str(formData, "id");
  const back = id ? `/drivers/${id}` : "/drivers/new";
  const row = driverFromForm(formData);
  if (!row.full_name || row.phone.length < 8) redirect(withError(back, `${t.driver.name} / ${t.driver.phone}`));
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("drivers").update(row).eq("id", id)
    : await supabase.from("drivers").insert(row);
  if (error) redirect(withError(back, friendlyDbError(error.message, t.assignment.overlap)));
  // The linked login's role and activation follow the driver record via a database trigger.
  revalidatePath("/drivers");
  redirect("/drivers?saved=1");
}

/** Creates a phone+password login for a driver/runner and links it (via the create-login Edge Function). */
export async function createDriverLogin(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const id = str(formData, "id");
  const password = str(formData, "password");
  if (!id) redirect("/drivers");
  const back = `/drivers/${id}`;
  if (!password || password.length < 8) redirect(withError(back, t.auth.passwordHint));
  const err = await createLogin({ kind: "driver", driver_id: id, password });
  if (err) redirect(withError(back, err));
  revalidatePath(back);
  redirect(`${back}?saved=1`);
}

/** Upserts drivers by phone from pasted sheet rows. */
export async function importDrivers(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const text = str(formData, "rows");
  if (!text) redirect(withError("/drivers/import", t.importer.paste));
  const { rows } = parseSheet(text);
  const errors: string[] = [];
  const clean: Record<string, unknown>[] = [];
  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    const phone = normalizePhone(r.phone ?? "");
    if (!r.full_name || phone.length < 8) { errors.push(`${t.importer.rowError} ${line}: ${t.driver.name} / ${t.driver.phone}`); continue; }
    clean.push({
      full_name: r.full_name,
      phone,
      kind: (r.kind ?? "driver").toLowerCase() === "runner" ? "runner" : "driver",
      national_id: r.national_id || null,
      license_class: r.license_class || null,
      license_expiry: r.license_expiry || null,
      status: (r.status ?? "active").toLowerCase() === "inactive" ? "inactive" : "active",
      notes: r.notes || null,
    });
  }
  if (errors.length) redirect(withError("/drivers/import", errors.slice(0, 8).join(" | ")));
  const supabase = await createClient();
  const { error } = await supabase.from("drivers").upsert(clean, { onConflict: "phone" });
  if (error) redirect(withError("/drivers/import", error.message));
  revalidatePath("/drivers");
  redirect(`/drivers?imported=${clean.length}`);
}
