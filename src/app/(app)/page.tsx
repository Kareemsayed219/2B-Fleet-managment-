import Link from "next/link";
import { requireUser, isStaffRole } from "@/lib/auth";
import { getDict, type Dict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { addDays, daysUntil, todayCairo } from "@/lib/dates";
import { Notice } from "@/components/Notice";

type VehicleRow = {
  id: string;
  plate: string;
  type: keyof Dict["vehicle"]["types"];
  status: keyof Dict["vehicle"]["statuses"];
  license_expiry: string | null;
  insurance_expiry: string | null;
};

export default async function HomePage() {
  const me = await requireUser();
  const { t } = await getDict();
  return isStaffRole(me.role) ? <StaffHome t={t} /> : <DriverHome t={t} driverId={me.driverId} />;
}

async function StaffHome({ t }: { t: Dict }) {
  const supabase = await createClient();
  const today = todayCairo();
  const soon = addDays(today, 30);
  const [{ data: vehicles }, { data: drivers }, { data: current }] = await Promise.all([
    supabase.from("vehicles").select("id, plate, type, status, license_expiry, insurance_expiry").neq("status", "retired"),
    supabase.from("drivers").select("id, full_name, kind, license_expiry, status").eq("status", "active"),
    supabase
      .from("assignments")
      .select("vehicle_id")
      .lte("start_date", today)
      .or(`end_date.is.null,end_date.gte.${today}`),
  ]);
  const vs = (vehicles ?? []) as VehicleRow[];
  const assigned = new Set((current ?? []).map((a) => a.vehicle_id));
  const unassigned = vs.filter((v) => v.status === "active" && !assigned.has(v.id));

  type Exp = { key: string; label: string; what: string; date: string; href: string };
  const expiring: Exp[] = [];
  for (const v of vs) {
    if (v.license_expiry && v.license_expiry <= soon)
      expiring.push({ key: v.id + "l", label: v.plate, what: t.vehicle.license, date: v.license_expiry, href: `/vehicles/${v.id}` });
    if (v.insurance_expiry && v.insurance_expiry <= soon)
      expiring.push({ key: v.id + "i", label: v.plate, what: t.vehicle.insurance, date: v.insurance_expiry, href: `/vehicles/${v.id}` });
  }
  for (const d of drivers ?? []) {
    if (d.license_expiry && d.license_expiry <= soon)
      expiring.push({ key: d.id, label: d.full_name, what: t.driver.licenseExpiry, date: d.license_expiry, href: `/drivers/${d.id}` });
  }
  expiring.sort((a, b) => a.date.localeCompare(b.date));

  const byStatus = Object.keys(t.vehicle.statuses)
    .filter((s) => s !== "retired")
    .map((s) => ({ s: s as VehicleRow["status"], n: vs.filter((v) => v.status === s).length }));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t.home.title}</h1>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label={t.home.vehicles} value={vs.length} href="/vehicles" />
        <Stat label={t.home.activeDrivers} value={(drivers ?? []).length} href="/drivers" />
        <Stat label={t.home.unassigned} value={unassigned.length} href="/assignments" warn={unassigned.length > 0} />
        <Stat label={t.home.expiring} value={expiring.length} warn={expiring.length > 0} />
      </div>

      <section className="card">
        <h2 className="mb-2 font-medium">{t.home.byStatus}</h2>
        <ul className="flex flex-wrap gap-4 text-sm">
          {byStatus.map(({ s, n }) => (
            <li key={s}>
              {t.vehicle.statuses[s]}: <strong>{n}</strong>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="mb-2 font-medium">{t.home.expiring}</h2>
        {expiring.length === 0 ? (
          <p className="text-sm text-muted">{t.common.none}</p>
        ) : (
          <table className="table">
            <tbody>
              {expiring.map((e) => {
                const d = daysUntil(e.date, today);
                return (
                  <tr key={e.key}>
                    <td><Link className="underline" href={e.href}><span className="ltr">{e.label}</span></Link></td>
                    <td>{e.what}</td>
                    <td className="ltr">{e.date}</td>
                    <td className={d < 0 ? "text-danger" : "text-warn"}>
                      {d < 0 ? t.common.expired : `${d} ${t.common.daysLeft}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {unassigned.length > 0 ? (
        <section className="card">
          <h2 className="mb-2 font-medium">{t.home.unassigned}</h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {unassigned.map((v) => (
              <li key={v.id} className="rounded border border-border px-2 py-1">
                <span className="ltr">{v.plate}</span> · {t.vehicle.types[v.type]}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, href, warn }: { label: string; value: number; href?: string; warn?: boolean }) {
  const body = (
    <div className="card h-full">
      <div className="text-sm text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${warn ? "text-warn" : ""}`}>{value}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

async function DriverHome({ t, driverId }: { t: Dict; driverId: string | null }) {
  if (!driverId) return <Notice kind="info">{t.home.notLinked}</Notice>;
  const supabase = await createClient();
  const today = todayCairo();
  const { data: rows } = await supabase
    .from("assignments")
    .select("start_date, vehicles(plate, type, make, model)")
    .eq("driver_id", driverId)
    .lte("start_date", today)
    .or(`end_date.is.null,end_date.gte.${today}`);
  const v = rows?.[0]?.vehicles as unknown as
    | { plate: string; type: VehicleRow["type"]; make: string | null; model: string | null }
    | undefined;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.home.myVehicle}</h1>
      {v ? (
        <div className="card">
          <div className="ltr text-2xl font-semibold">{v.plate}</div>
          <div className="text-muted">
            {t.vehicle.types[v.type]} {v.make ?? ""} {v.model ?? ""}
          </div>
        </div>
      ) : (
        <Notice kind="info">{t.home.noVehicle}</Notice>
      )}
      <Notice kind="info">{t.home.comingSoon}</Notice>
    </div>
  );
}
