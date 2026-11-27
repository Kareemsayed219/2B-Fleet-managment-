import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { getDict, type Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { todayCairo } from "@/lib/dates";
import { Notice } from "@/components/Notice";

type Row = {
  id: string; full_name: string; phone: string; kind: keyof Dict["driver"]["kinds"];
  status: keyof Dict["driver"]["statuses"]; license_expiry: string | null; profile_id: string | null;
};

export default async function DriversPage({ searchParams }: PageProps<"/drivers">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const q = typeof sp.q === "string" ? sp.q.trim().replace(/[%_,()]/g, "") : "";
  const kind = typeof sp.kind === "string" ? sp.kind : "";
  const today = todayCairo();

  let query = supabase
    .from("drivers")
    .select("id, full_name, phone, kind, status, license_expiry, profile_id")
    .order("full_name");
  if (q) query = query.or(`full_name.ilike.%${q}%,phone.ilike.%${q}%`);
  if (kind) query = query.eq("kind", kind);
  const [{ data }, { data: current }] = await Promise.all([
    query,
    supabase
      .from("assignments")
      .select("driver_id, vehicles(plate)")
      .lte("start_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`),
  ]);
  const plateByDriver = new Map(
    (current ?? []).map((a) => [a.driver_id, (a.vehicles as unknown as { plate: string } | null)?.plate]),
  );
  const rows = (data ?? []) as Row[];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold">{t.driver.title}</h1>
        <span className="text-muted">({rows.length})</span>
        <div className="ms-auto flex gap-2">
          <Link className="btn-ghost" href="/drivers/import">{t.importer.title}</Link>
          <Link className="btn" href="/drivers/new">{t.driver.new}</Link>
        </div>
      </div>
      {sp.saved ? <Notice kind="ok">{t.common.saved}</Notice> : null}
      {sp.imported ? <Notice kind="ok">{sp.imported} {t.importer.result}</Notice> : null}
      <form className="flex flex-wrap gap-2">
        <input className="input max-w-xs" name="q" placeholder={`${t.driver.name} / ${t.driver.phone}`} defaultValue={q} />
        <select className="input max-w-xs" name="kind" defaultValue={kind}>
          <option value="">{t.common.all}</option>
          {Object.entries(t.driver.kinds).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
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
                <th>{t.driver.name}</th><th>{t.driver.phone}</th><th>{t.driver.kind}</th>
                <th>{t.common.status}</th><th>{t.driver.vehicleNow}</th><th>{t.driver.licenseExpiry}</th><th>{t.driver.login}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id}>
                  <td><Link className="font-medium underline" href={`/drivers/${d.id}`}>{d.full_name}</Link></td>
                  <td className="ltr">{d.phone}</td>
                  <td>{t.driver.kinds[d.kind]}</td>
                  <td>{t.driver.statuses[d.status]}</td>
                  <td className="ltr">{plateByDriver.get(d.id) ?? "—"}</td>
                  <td className={`ltr ${d.license_expiry && d.license_expiry < today ? "text-danger" : ""}`}>{d.license_expiry ?? ""}</td>
                  <td className={d.profile_id ? "text-ok" : "text-muted"}>{d.profile_id ? t.driver.hasLogin : t.driver.noLogin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
