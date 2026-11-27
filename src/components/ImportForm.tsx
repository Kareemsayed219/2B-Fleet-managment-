import type { Dict } from "@/lib/i18n";
import { Notice } from "./Notice";

/** Paste-from-sheet importer shared by vehicles and drivers. */
export function ImportForm({
  t, columns, action, error, example, cancelHref,
}: {
  t: Dict; columns: readonly string[]; action: (fd: FormData) => Promise<void>;
  error?: string; example: string; cancelHref: string;
}) {
  return (
    <form action={action} className="card flex flex-col gap-3">
      <p className="text-sm text-muted">{t.importer.help}</p>
      <code className="ltr block overflow-x-auto rounded bg-background p-2 text-xs">{columns.join("\t")}</code>
      <p className="ltr text-xs text-muted">e.g. {example}</p>
      {error ? <Notice kind="error">{error}</Notice> : null}
      <textarea className="input ltr font-mono text-sm" name="rows" rows={14} required />
      <div className="flex gap-2">
        <button className="btn" type="submit">{t.common.import}</button>
        <a className="btn-ghost" href={cancelHref}>{t.common.cancel}</a>
      </div>
    </form>
  );
}
