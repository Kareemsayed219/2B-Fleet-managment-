import "server-only";
import { createClient } from "@/lib/supabase/server";

type CreateLoginInput =
  | { kind: "driver"; driver_id: string; password: string }
  | { kind: "staff"; email: string; full_name: string; phone: string | null; password: string };

/**
 * Calls the create-login Edge Function with the signed-in user's session.
 * The function holds the secret key inside Supabase and re-checks the caller's role.
 * Returns an error message, or null on success.
 */
export async function createLogin(input: CreateLoginInput): Promise<string | null> {
  const supabase = await createClient();
  const { error } = await supabase.functions.invoke("create-login", { body: input });
  if (!error) return null;
  // FunctionsHttpError carries the function's JSON body in error.context.
  try {
    const res = (error as { context?: Response }).context;
    const body = res ? await res.json() : null;
    if (body?.error) return String(body.error);
  } catch {}
  return error.message;
}
