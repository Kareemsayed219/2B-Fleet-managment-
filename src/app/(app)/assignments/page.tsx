import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { todayCairo } from "@/lib/dates";
import { Notice } from "@/components/Notice";
import { Field, Select } from "@/components/fields";
import { createAssignment, endAssignment } from "./actions";

type Row = {
  id: string; start_date: string; end_date: string | null; notes: string | null;
  vehicles: { plate: string } | null; drivers: { full_name: string } | null;
};

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const today = todayCairo();
  const [{ data: rows }, { data: vehicles }, { data: drivers }] = await Promise.all([
    supabase
      .from("assignments")
      .select("id, start_date, end_date, notes, vehicles(plate), drivers(full_name)")
      .order("start_date", { ascending: false })
      .limit(300),
    supabase.from("vehicles").select("id, plate").neq("status", "retired").order("plate"),
    supabase.from("drivers").select("id, full_name").eq("status", "active").order("full_name"),
  ]);
  const all = (rows ?? []) as unknown as Row[];
  const isCurrent = (a: Row) => a.start_date <= today && (!a.end_date || a.end_date >= today);
  const current = all.filter(isCurrent);
  const past = all.filter((a) => !isCurrent(a));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.assignment.title}</h1>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      {sp.saved ? <Notice kind="ok">{t.common.saved}</Notice> : null}

      <form action={createAssignment} className="card grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <h2 className="font-medium sm:col-span-2 lg:col-span-5">{t.assignment.new}</h2>
        <Select label={t.assignment.vehicle} name="vehicle_id" required includeEmpty=""
          options={(vehicles ?? []).map((v) => ({ value: v.id, label: v.plate }))} />
        <Select label={t.assignment.driver} name="driver_id" required includeEmpty=""
          options={(drivers ?? []).map((d) => ({ value: d.id, label: d.full_name }))} />
        <Field label={t.assignment.start} name="start_date" type="date" defaultValue={today} required />
        <Field label={t.assignment.end} name="end_date" type="date" />
        <button className="btn" type="submit">{t.common.save}</button>
      </form>

      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-medium">{t.assignment.current} ({current.length})</h2>
        <AssignmentTable rows={current} t={t} canEnd />
      </section>
      <section className="card overflow-x-auto">
        <h2 className="mb-2 font-medium">{t.assignment.history}</h2>
        <AssignmentTable rows={past} t={t} canEnd={false} />
      </section>
    </div>
  );
}

function AssignmentTable({ rows, t, canEnd }: { rows: Row[]; t: Awaited<ReturnType<typeof getDict>>["t"]; canEnd: boolean }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{t.common.noRows}</p>;
  return (
    <table className="table">
      <thead>
        <tr>
          <th>{t.assignment.vehicle}</th><th>{t.assignment.driver}</th>
          <th>{t.assignment.start}</th><th>{t.assignment.end}</th>{canEnd ? <th /> : null}
        </tr>
      </thead>
      <tbody>
        {rows.map((a) => (
          <tr key={a.id}>
            <td className="ltr">{a.vehicles?.plate}</td>
            <td>{a.drivers?.full_name}</td>
            <td className="ltr">{a.start_date}</td>
            <td className="ltr">{a.end_date ?? t.assignment.open}</td>
            {canEnd ? (
              <td>
                {!a.end_date ? (
                  <form action={endAssignment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="btn-ghost" type="submit">{t.assignment.endNow}</button>
                  </form>
                ) : null}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
