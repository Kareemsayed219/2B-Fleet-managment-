import Link from "next/link";
import type { Dict } from "@/lib/i18n";
import { Field, Select, TextArea, opts } from "@/components/fields";
import { saveVehicle } from "./actions";

export type Vehicle = {
  id: string; plate: string; type: string; ownership: string; make: string | null; model: string | null;
  year: number | null; tank_liters: number | null; baseline_l_per_100km: number | null; km_source: string;
  gps_provider: string | null; petroapp_card_id: string | null; status: string;
  license_expiry: string | null; insurance_expiry: string | null; notes: string | null;
};

export function VehicleForm({ t, v }: { t: Dict; v?: Vehicle }) {
  const tv = t.vehicle;
  return (
    <form action={saveVehicle} className="card grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {v ? <input type="hidden" name="id" value={v.id} /> : null}
      <Field label={tv.plate} name="plate" defaultValue={v?.plate} required ltr />
      <Select label={tv.type} name="type" options={opts(tv.types)} defaultValue={v?.type} required includeEmpty="" />
      <Select label={tv.ownership} name="ownership" options={opts(tv.ownerships)} defaultValue={v?.ownership ?? "company"} />
      <Field label={tv.make} name="make" defaultValue={v?.make} />
      <Field label={tv.model} name="model" defaultValue={v?.model} />
      <Field label={tv.year} name="year" type="number" min={1980} max={2100} defaultValue={v?.year} />
      <Field label={tv.tank} name="tank_liters" type="number" step="0.1" defaultValue={v?.tank_liters} />
      <Field label={tv.baseline} name="baseline_l_per_100km" type="number" step="0.01" defaultValue={v?.baseline_l_per_100km} />
      <Select label={tv.kmSource} name="km_source" options={opts(tv.kmSources)} defaultValue={v?.km_source ?? "photo"} />
      <Field label={tv.gpsProvider} name="gps_provider" defaultValue={v?.gps_provider} />
      <Field label={tv.petroCard} name="petroapp_card_id" defaultValue={v?.petroapp_card_id} ltr />
      <Select label={t.common.status} name="status" options={opts(tv.statuses)} defaultValue={v?.status ?? "active"} />
      <Field label={tv.license} name="license_expiry" type="date" defaultValue={v?.license_expiry} />
      <Field label={tv.insurance} name="insurance_expiry" type="date" defaultValue={v?.insurance_expiry} />
      <div className="sm:col-span-2 lg:col-span-3">
        <TextArea label={t.common.notes} name="notes" defaultValue={v?.notes} />
      </div>
      <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
        <button className="btn" type="submit">{t.common.save}</button>
        <Link className="btn-ghost" href="/vehicles">{t.common.cancel}</Link>
      </div>
    </form>
  );
}
