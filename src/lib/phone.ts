/**
 * Drivers and runners sign in with their phone number, not an email.
 * Supabase Auth needs an email, so each phone maps to a fixed internal address.
 * No SMS provider is needed, and these addresses never receive mail.
 */
export const PHONE_EMAIL_DOMAIN = "phone.2b-fleet.local";

export function normalizePhone(raw: string): string {
  // Arabic-Indic and Eastern Arabic digits to Latin, then keep digits only.
  const latin = raw.replace(/[٠-٩۰-۹]/g, (d) =>
    String((d.charCodeAt(0) & 0xf) % 10),
  );
  let digits = latin.replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;
  return digits;
}

/** Turns what the user typed in the login box into the Auth email. */
export function loginToEmail(login: string): string {
  const trimmed = login.trim();
  if (trimmed.includes("@")) return trimmed.toLowerCase();
  return `${normalizePhone(trimmed)}@${PHONE_EMAIL_DOMAIN}`;
}
