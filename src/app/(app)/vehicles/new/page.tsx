import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { Notice } from "@/components/Notice";
import { VehicleForm } from "../VehicleForm";

export default async function NewVehiclePage({ searchParams }: PageProps<"/vehicles/new">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.vehicle.new}</h1>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      <VehicleForm t={t} />
    </div>
  );
}
