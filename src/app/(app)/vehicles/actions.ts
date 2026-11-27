"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError, num, str, withError } from "@/lib/form";
import { parseSheet } from "@/lib/sheet";
import { getDict } from "@/lib/i18n";
import { normalizePlate } from "@/lib/columns";

const TYPES = ["light_truck", "jumbo", "private_car", "van", "motorcycle"];
const STATUSES = ["active", "workshop", "off_road", "retired"];

function vehicleFromForm(fd: FormData) {
  return {
    type: str(fd, "type"),
    ownership: str(fd, "ownership") ?? "company",
    make: str(fd, "make"),
    model: str(fd, "model"),
    year: num(fd, "year"),
    tank_liters: num(fd, "tank_liters"),
    baseline_l_per_100km: num(fd, "baseline_l_per_100km"),
    km_source: str(fd, "km_source") ?? "photo",
    gps_provider: str(fd, "gps_provider"),
    petroapp_card_id: str(fd, "petroapp_card_id"),
    status: str(fd, "status") ?? "active",
    license_expiry: str(fd, "license_expiry"),
    insurance_expiry: str(fd, "insurance_expiry"),
    notes: str(fd, "notes"),
  };
}

export async function saveVehicle(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const id = str(formData, "id");
  const plate = str(formData, "plate");
  const back = id ? `/vehicles/${id}` : "/vehicles/new";
  if (!plate) redirect(withError(back, t.vehicle.plate));
  const row = { plate: normalizePlate(plate), ...vehicleFromForm(formData) };
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("vehicles").update(row).eq("id", id)
    : await supabase.from("vehicles").insert(row);
  if (error) redirect(withError(back, friendlyDbError(error.message, t.assignment.overlap)));
  revalidatePath("/vehicles");
  redirect("/vehicles?saved=1");
}

/** Upserts vehicles by plate from pasted sheet rows. Unknown columns are ignored. */
export async function importVehicles(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const text = str(formData, "rows");
  if (!text) redirect(withError("/vehicles/import", t.importer.paste));
  const { rows } = parseSheet(text);
  const errors: string[] = [];
  const clean: Record<string, unknown>[] = [];
  for (const [i, r] of rows.entries()) {
    const line = i + 2;
    if (!r.plate) { errors.push(`${t.importer.rowError} ${line}: ${t.vehicle.plate}`); continue; }
    const type = (r.type ?? "").toLowerCase().replace(/\s+/g, "_");
    if (!TYPES.includes(type)) { errors.push(`${t.importer.rowError} ${line}: type "${r.type ?? ""}"`); continue; }
    const status = (r.status ?? "active").toLowerCase();
    if (!STATUSES.includes(status)) { errors.push(`${t.importer.rowError} ${line}: status "${r.status}"`); continue; }
    const n = (k: string) => (r[k] ? Number(r[k].replace(",", ".")) : null);
    clean.push({
      plate: normalizePlate(r.plate),
      type,
      ownership: (r.ownership ?? "company").toLowerCase() === "personal" ? "personal" : "company",
      make: r.make || null,
      model: r.model || null,
      year: n("year"),
      tank_liters: n("tank_liters"),
      baseline_l_per_100km: n("baseline_l_per_100km"),
      km_source: (r.km_source ?? "photo").toLowerCase() === "gps" ? "gps" : "photo",
      gps_provider: r.gps_provider || null,
      petroapp_card_id: r.petroapp_card_id || null,
      status,
      license_expiry: r.license_expiry || null,
      insurance_expiry: r.insurance_expiry || null,
      notes: r.notes || null,
    });
  }
  if (errors.length) redirect(withError("/vehicles/import", errors.slice(0, 8).join(" | ")));
  const supabase = await createClient();
  const { error } = await supabase.from("vehicles").upsert(clean, { onConflict: "plate" });
  if (error) redirect(withError("/vehicles/import", error.message));
  revalidatePath("/vehicles");
  redirect(`/vehicles?imported=${clean.length}`);
}
