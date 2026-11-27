import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDict, type Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { todayCairo } from "@/lib/dates";
import { Notice } from "@/components/Notice";

type Row = {
  id: string; plate: string; type: keyof Dict["vehicle"]["types"]; status: keyof Dict["vehicle"]["statuses"];
  ownership: keyof Dict["vehicle"]["ownerships"]; km_source: keyof Dict["vehicle"]["kmSources"];
  make: string | null; model: string | null; license_expiry: string | null; insurance_expiry: string | null;
};

export default async function VehiclesPage({ searchParams }: PageProps<"/vehicles">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const today = todayCairo();

  let query = supabase
    .from("vehicles")
    .select("id, plate, type, status, ownership, km_source, make, model, license_expiry, insurance_expiry")
    .order("plate");
  if (q) query = query.ilike("plate", `%${q.replace(/[%_]/g, "")}%`);
  if (type) query = query.eq("type", type);
  const [{ data }, { data: current }] = await Promise.all([
    query,
    supabase
      .from("assignments")
      .select("vehicle_id, drivers(full_name)")
      .lte("start_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`),
  ]);
  const driverByVehicle = new Map(
    (current ?? []).map((a) => [a.vehicle_id, (a.drivers as unknown as { full_name: string } | null)?.full_name]),
  );
  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{t.vehicle.title}</h1>
        <span className="text-muted">({rows.length})</span>
        <div className="ms-auto flex gap-2">
          <Link className="btn-ghost" href="/vehicles/import">{t.importer.title}</Link>
          <Link className="btn" href="/vehicles/new">{t.vehicle.new}</Link>
        </div>
      </div>
      {sp.saved ? <Notice kind="ok">{t.common.saved}</Notice> : null}
      {sp.imported ? <Notice kind="ok">{sp.imported} {t.importer.result}</Notice> : null}
      <form className="flex flex-wrap gap-2">
        <input className="input max-w-xs ltr" name="q" placeholder={t.vehicle.plate} defaultValue={q} />
        <select className="input max-w-xs" name="type" defaultValue={type}>
          <option value="">{t.common.all}</option>
          {Object.entries(t.vehicle.types).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <button className="btn-ghost" type="submit">{t.common.search}</button>
      </form>
      <div className="card overflow-x-auto p-0">
        {rows.length === 0 ? (
          <p className="p-4 text-sm text-muted">{t.common.noRows}</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t.vehicle.plate}</th><th>{t.vehicle.type}</th><th>{t.vehicle.make}</th>
                <th>{t.common.status}</th><th>{t.vehicle.driverNow}</th><th>{t.vehicle.kmSource}</th>
                <th>{t.vehicle.license}</th><th>{t.vehicle.insurance}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((v) => (
                <tr key={v.id}>
                  <td><Link className="font-medium underline" href={`/vehicles/${v.id}`}><span className="ltr">{v.plate}</span></Link></td>
                  <td>{t.vehicle.types[v.type]}{v.ownership === "personal" ? ` · ${t.vehicle.ownerships.personal}` : ""}</td>
                  <td>{[v.make, v.model].filter(Boolean).join(" ")}</td>
                  <td>{t.vehicle.statuses[v.status]}</td>
                  <td>{driverByVehicle.get(v.id) ?? <span className="text-muted">—</span>}</td>
                  <td>{t.vehicle.kmSources[v.km_source]}</td>
                  <td className={`ltr ${v.license_expiry && v.license_expiry < today ? "text-danger" : ""}`}>{v.license_expiry ?? ""}</td>
                  <td className={`ltr ${v.insurance_expiry && v.insurance_expiry < today ? "text-danger" : ""}`}>{v.insurance_expiry ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
