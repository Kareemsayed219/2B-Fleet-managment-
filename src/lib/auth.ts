import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Role = "manager" | "admin" | "driver" | "runner" | "pending";
export type Me = {
  id: string;
  full_name: string;
  role: Role;
  active: boolean;
  driverId: string | null;
};

/** The signed-in user's profile, or null. Cached for one request. */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("id", uid)
    .maybeSingle();
  if (!profile) return null;
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("profile_id", uid)
    .maybeSingle();
  return { ...(profile as Omit<Me, "driverId">), driverId: driver?.id ?? null };
});

export const isStaffRole = (r: Role) => r === "manager" || r === "admin";

export async function requireUser(): Promise<Me> {
  const me = await getMe();
  if (!me) redirect("/login");
  if (!me.active) redirect("/login?pending=1");
  return me;
}

export async function requireStaff(): Promise<Me> {
  const me = await requireUser();
  if (!isStaffRole(me.role)) redirect("/");
  return me;
}

export async function requireManager(): Promise<Me> {
  const me = await requireUser();
  if (me.role !== "manager") redirect("/");
  return me;
}
