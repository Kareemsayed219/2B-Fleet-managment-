/** Helpers for reading plain HTML form posts in server actions. */
export function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key);
  if (v === null) return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Redirect target carrying an error message back to the form. */
export function withError(path: string, message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}error=${encodeURIComponent(message.slice(0, 300))}`;
}

export function friendlyDbError(message: string, overlapText: string): string {
  if (message.includes("no_overlap")) return overlapText;
  if (message.includes("duplicate key")) return message.replace(/^.*Key /, "Duplicate: ");
  return message;
}
