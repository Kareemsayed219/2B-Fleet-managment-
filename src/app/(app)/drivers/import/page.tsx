import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { DRIVER_COLUMNS } from "@/lib/columns";
import { ImportForm } from "@/components/ImportForm";
import { importDrivers } from "../actions";

export default async function ImportDriversPage({ searchParams }: PageProps<"/drivers/import">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.importer.title} · {t.driver.title}</h1>
      <p className="text-sm text-muted">kind: driver, runner · status: active, inactive · dates: YYYY-MM-DD</p>
      <ImportForm
        t={t}
        columns={DRIVER_COLUMNS}
        action={importDrivers}
        error={typeof sp.error === "string" ? sp.error : undefined}
        example="Ahmed Ali, 01012345678, driver, 29001011234567, Third, 2027-06-30, active,"
        cancelHref="/drivers"
      />
    </div>
  );
}
