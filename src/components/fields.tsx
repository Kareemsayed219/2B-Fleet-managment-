/** Small labelled form controls used by every form. */
export function Field({
  label, name, defaultValue, type = "text", required, ltr, step, min, max, placeholder,
}: {
  label: string; name: string; defaultValue?: string | number | null; type?: string;
  required?: boolean; ltr?: boolean; step?: string; min?: number; max?: number; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}{required ? " *" : ""}</span>
      <input
        className={`input ${ltr || type === "date" || type === "number" ? "ltr" : ""}`}
        name={name} type={type} required={required} step={step} min={min} max={max}
        placeholder={placeholder} defaultValue={defaultValue ?? undefined}
      />
    </label>
  );
}

export function Select({
  label, name, options, defaultValue, required, includeEmpty,
}: {
  label: string; name: string; options: { value: string; label: string }[];
  defaultValue?: string | null; required?: boolean; includeEmpty?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}{required ? " *" : ""}</span>
      <select className="input" name={name} required={required} defaultValue={defaultValue ?? ""}>
        {includeEmpty !== undefined ? <option value="">{includeEmpty}</option> : null}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function TextArea({ label, name, defaultValue, rows = 3, ltr }: {
  label: string; name: string; defaultValue?: string | null; rows?: number; ltr?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      <textarea className={`input ${ltr ? "ltr font-mono text-sm" : ""}`} name={name} rows={rows} defaultValue={defaultValue ?? undefined} />
    </label>
  );
}

export function opts<T extends Record<string, string>>(labels: T) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}
