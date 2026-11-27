import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/Notice";
import { VehicleForm, type Vehicle } from "../VehicleForm";

export default async function EditVehiclePage({ params, searchParams }: PageProps<"/vehicles/[id]">) {
  await requireStaff();
  const { id } = await params;
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const [{ data: v }, { data: history }] = await Promise.all([
    supabase.from("vehicles").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("assignments")
      .select("id, start_date, end_date, drivers(full_name)")
      .eq("vehicle_id", id)
      .order("start_date", { ascending: false })
      .limit(20),
  ]);
  if (!v) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {t.vehicle.editTitle} · <span className="ltr">{v.plate}</span>
      </h1>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      <VehicleForm t={t} v={v as Vehicle} />
      <section className="card">
        <h2 className="mb-2 font-medium">{t.assignment.history}</h2>
        {(history ?? []).length === 0 ? (
          <p className="text-sm text-muted">{t.common.noRows}</p>
        ) : (
          <table className="table">
            <tbody>
              {(history ?? []).map((a) => (
                <tr key={a.id}>
                  <td>{(a.drivers as unknown as { full_name: string } | null)?.full_name}</td>
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
