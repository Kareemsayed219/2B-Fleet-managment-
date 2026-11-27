import { requireManager, type Role } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/Notice";
import { Field } from "@/components/fields";
import { createStaffLogin, updateUser } from "./actions";

export default async function UsersPage({ searchParams }: PageProps<"/users">) {
  const me = await requireManager();
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, phone, role, active, created_at")
    .order("created_at");
  const users = (data ?? []) as { id: string; full_name: string; phone: string | null; role: Role; active: boolean }[];
  const hasServiceKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.users.title}</h1>
      <p className="text-sm text-muted">{t.users.intro}</p>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      {sp.saved ? <Notice kind="ok">{t.common.saved}</Notice> : null}

      <div className="card overflow-x-auto p-0">
        <table className="table">
          <thead>
            <tr><th>{t.auth.fullName}</th><th>{t.driver.phone}</th><th>{t.users.role}</th><th>{t.users.active}</th><th /></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || "—"}</td>
                <td className="ltr">{u.phone ?? ""}</td>
                {u.id === me.id ? (
                  <>
                    <td>{t.users.roles[u.role]}</td>
                    <td>{t.common.yes}</td>
                    <td />
                  </>
                ) : (
                  <td colSpan={3}>
                    <form action={updateUser} className="flex flex-wrap items-center gap-3">
                      <input type="hidden" name="id" value={u.id} />
                      <select className="input max-w-40" name="role" defaultValue={u.role}>
                        {Object.entries(t.users.roles).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>
                      <label className="flex items-center gap-1 text-sm">
                        <input type="checkbox" name="active" defaultChecked={u.active} /> {t.users.active}
                      </label>
                      <button className="btn-ghost" type="submit">{t.common.save}</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="card flex flex-col gap-3">
        <h2 className="font-medium">{t.users.newStaff}</h2>
        {!hasServiceKey ? (
          <Notice kind="info">{t.driver.serviceKeyMissing}</Notice>
        ) : (
          <form action={createStaffLogin} className="grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
            <Field label={t.auth.fullName} name="full_name" required />
            <Field label={t.users.login} name="login" required ltr />
            <Field label={t.auth.password} name="password" required ltr />
            <button className="btn" type="submit">{t.common.add}</button>
          </form>
        )}
      </section>
    </div>
  );
}
