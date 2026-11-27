import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { Field, Select, TextArea, opts } from "@/components/fields";
import { saveDriver } from "./actions";

export type Driver = {
  id: string; full_name: string; phone: string; kind: string; national_id: string | null;
  license_class: string | null; license_expiry: string | null; status: string; notes: string | null;
  profile_id: string | null;
};

export function DriverForm({ t, d }: { t: Dict; d?: Driver }) {
  const td = t.driver;
  return (
    <form action={saveDriver} className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {d ? <input type="hidden" name="id" value={d.id} /> : null}
      <Field label={td.name} name="full_name" defaultValue={d?.full_name} required />
      <Field label={td.phone} name="phone" type="tel" defaultValue={d?.phone} required ltr />
      <Select label={td.kind} name="kind" options={opts(td.kinds)} defaultValue={d?.kind ?? "driver"} />
      <Field label={td.nationalId} name="national_id" defaultValue={d?.national_id} ltr />
      <Field label={td.licenseClass} name="license_class" defaultValue={d?.license_class} />
      <Field label={td.licenseExpiry} name="license_expiry" type="date" defaultValue={d?.license_expiry} />
      <Select label={t.common.status} name="status" options={opts(td.statuses)} defaultValue={d?.status ?? "active"} />
      <div className="sm:col-span-2 lg:col-span-3">
        <TextArea label={t.common.notes} name="notes" defaultValue={d?.notes} />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <button className="btn" type="submit">{t.common.save}</button>
        <Link className="btn-ghost" href="/drivers">{t.common.cancel}</Link>
      </div>
    </form>
  );
}
