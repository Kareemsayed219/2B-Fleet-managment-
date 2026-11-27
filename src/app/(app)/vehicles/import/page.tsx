import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { VEHICLE_COLUMNS } from "@/lib/columns";
import { ImportForm } from "@/components/ImportForm";
import { importVehicles } from "../actions";

export default async function ImportVehiclesPage({ searchParams }: PageProps<"/vehicles/import">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.importer.title} · {t.vehicle.title}</h1>
      <p className="text-sm text-muted">
        type: light_truck, jumbo, private_car, van, motorcycle · status: active, workshop, off_road, retired ·
        ownership: company, personal · km_source: gps, photo · dates: YYYY-MM-DD
      </p>
      <ImportForm
        t={t}
        columns={VEHICLE_COLUMNS}
        action={importVehicles}
        error={typeof sp.error === "string" ? sp.error : undefined}
        example="ABC 1234, van, company, Toyota, Hiace, 2021, 70, 11.5, photo, , , active, 2027-03-01, 2027-01-15,"
        cancelHref="/vehicles"
      />
    </div>
  );
}
