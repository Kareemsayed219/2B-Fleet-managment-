// Creates a login (Supabase Auth user) for a driver/runner or an admin-team member.
// Runs inside Supabase so the secret key never leaves Supabase.
// The caller's own session decides what is allowed:
//   kind "driver": manager or admin; links the new login to an existing driver record.
//   kind "staff":  manager only; creates an active admin login.
import { createClient } from "npm:@supabase/supabase-js@2";

const PHONE_EMAIL_DOMAIN = "phone.2b-fleet.local";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function firstKey(envName: string): string | undefined {
  const raw = Deno.env.get(envName);
  if (!raw) return undefined;
  try {
    const keys = JSON.parse(raw) as Record<string, string>;
    return keys["default"] ?? Object.values(keys)[0];
  } catch {
    return undefined;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const publishable = firstKey("SUPABASE_PUBLISHABLE_KEYS") ?? Deno.env.get("SUPABASE_ANON_KEY");
  const secret = firstKey("SUPABASE_SECRET_KEYS") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!publishable || !secret) return json({ error: "server keys unavailable" }, 500);

  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "not signed in" }, 401);

  const admin = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: who, error: whoErr } = await admin.auth.getUser(token);
  if (whoErr || !who.user) return json({ error: "not signed in" }, 401);

  // Caller's role, read with the service client but strictly for the verified user id.
  const { data: me } = await admin.from("profiles").select("role, active").eq("id", who.user.id).maybeSingle();
  const role = me?.active ? me.role : null;
  const isStaff = role === "manager" || role === "admin";

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad request" }, 400);
  }
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 8) return json({ error: "password must be at least 8 characters" }, 400);

  if (body.kind === "driver") {
    if (!isStaff) return json({ error: "forbidden" }, 403);
    const driverId = typeof body.driver_id === "string" ? body.driver_id : "";
    const { data: d } = await admin
      .from("drivers")
      .select("id, full_name, phone, kind, status, profile_id")
      .eq("id", driverId)
      .maybeSingle();
    if (!d) return json({ error: "driver not found" }, 404);
    if (d.profile_id) return json({ error: "this driver already has a login" }, 409);

    const { data: created, error } = await admin.auth.admin.createUser({
      email: `${d.phone}@${PHONE_EMAIL_DOMAIN}`,
      password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name, phone: d.phone },
    });
    if (error || !created.user) return json({ error: error?.message ?? "could not create login" }, 400);
    const uid = created.user.id;

    const { error: pErr } = await admin.from("profiles").update({ role: d.kind, active: d.status === "active" }).eq("id", uid);
    const { error: lErr } = pErr ? { error: null } : await admin.from("drivers").update({ profile_id: uid }).eq("id", d.id);
    if (pErr || lErr) {
      await admin.auth.admin.deleteUser(uid);
      return json({ error: (pErr ?? lErr)!.message }, 500);
    }
    return json({ ok: true, user_id: uid });
  }

  if (body.kind === "staff") {
    if (role !== "manager") return json({ error: "forbidden" }, 403);
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email.includes("@")) return json({ error: "bad login" }, 400);
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: typeof body.full_name === "string" ? body.full_name : "",
        phone: typeof body.phone === "string" ? body.phone : null,
      },
    });
    if (error || !created.user) return json({ error: error?.message ?? "could not create login" }, 400);
    const uid = created.user.id;
    const { error: pErr } = await admin.from("profiles").update({ role: "admin", active: true }).eq("id", uid);
    if (pErr) {
      await admin.auth.admin.deleteUser(uid);
      return json({ error: pErr.message }, 500);
    }
    return json({ ok: true, user_id: uid });
  }

  return json({ error: "bad request" }, 400);
});
