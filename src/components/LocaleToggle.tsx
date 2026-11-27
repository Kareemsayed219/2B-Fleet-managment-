import { toggleLocale } from "@/app/actions";

/** Switches Arabic/English and returns to the current page (via the Referer header unless `back` is given). */
export function LocaleToggle({ label, back }: { label: string; back?: string }) {
  return (
    <form action={toggleLocale}>
      {back ? <input type="hidden" name="back" value={back} /> : null}
      <button className="btn-ghost" type="submit">
        {label}
      </button>
    </form>
  );
}
