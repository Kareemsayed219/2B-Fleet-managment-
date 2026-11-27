"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError, str, withError } from "@/lib/form";
import { todayCairo } from "@/lib/dates";
import { getDict } from "@/lib/i18n";

export async function createAssignment(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const vehicle_id = str(formData, "vehicle_id");
  const driver_id = str(formData, "driver_id");
  if (!vehicle_id || !driver_id) redirect(withError("/assignments", `${t.assignment.vehicle} / ${t.assignment.driver}`));
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    vehicle_id,
    driver_id,
    start_date: str(formData, "start_date") ?? todayCairo(),
    end_date: str(formData, "end_date"),
    notes: str(formData, "notes"),
  });
  if (error) redirect(withError("/assignments", friendlyDbError(error.message, t.assignment.overlap)));
  revalidatePath("/assignments");
  redirect("/assignments?saved=1");
}

/** Closes an open assignment as of today (the driver handed the vehicle back). */
export async function endAssignment(formData: FormData) {
  await requireStaff();
  const { t } = await getDict();
  const id = str(formData, "id");
  if (!id) redirect("/assignments");
  const supabase = await createClient();
  const { data: a } = await supabase.from("assignments").select("start_date").eq("id", id).maybeSingle();
  const today = todayCairo();
  const end = a && a.start_date > today ? a.start_date : today;
  const { error } = await supabase.from("assignments").update({ end_date: end }).eq("id", id);
  if (error) redirect(withError("/assignments", friendlyDbError(error.message, t.assignment.overlap)));
  revalidatePath("/assignments");
  redirect("/assignments?saved=1");
}
