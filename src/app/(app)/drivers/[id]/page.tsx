import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/Notice";
import { Field } from "@/components/fields";
import { DriverForm, type Driver } from "../DriverForm";
import { createDriverLogin } from "../actions";

export default async function EditDriverPage({ params, searchParams }: PageProps<"/drivers/[id]">) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const [{ data: d }, { data: history }] = await Promise.all([
    supabase.from("drivers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("assignments")
      .select("id, start_date, end_date, vehicles(plate)")
      .eq("driver_id", id)
      .order("start_date", { ascending: false })
      .limit(20),
  ]);
  if (!d) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.driver.editTitle} · {d.full_name}</h1>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      {sp.saved ? <Notice kind="ok">{t.common.saved}</Notice> : null}
      <DriverForm t={t} d={d as Driver} />

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">{t.driver.login}</h2>
        {d.profile_id ? (
          <p className="text-sm text-ok">
            {t.driver.hasLogin} · <span className="ltr">{d.phone}</span>
          </p>
        ) : (
          <form action={createDriverLogin} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="id" value={d.id} />
            <div className="min-w-56">
              <Field label={t.driver.loginPassword} name="password" type="text" required ltr />
            </div>
            <button className="btn" type="submit">{t.driver.createLogin}</button>
            <p className="w-full text-xs text-muted">{t.driver.loginHelp} {t.auth.passwordHint}</p>
          </form>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-medium">{t.assignment.history}</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-muted">{t.common.noRows}</p>
        ) : (
          <table className="table">
            <tbody>
              {(history ?? []).map((a) => (
                <tr key={a.id}>
                  <td className="ltr">{(a.vehicles as unknown as { plate: string } | null)?.plate}</td>
                  <td className="ltr">{a.start_date}</td>
                  <td className="ltr">{a.end_date ?? t.assignment.open}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
