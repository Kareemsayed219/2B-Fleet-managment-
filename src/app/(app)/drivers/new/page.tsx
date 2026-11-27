import { requireStaff } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { Notice } from "@/components/Notice";
import { DriverForm } from "../DriverForm";

export default async function NewDriverPage({ searchParams }: PageProps<"/drivers/new">) {
  await requireStaff();
  const sp = await searchParams;
  const { t } = await getDict();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{t.driver.new}</h1>
      {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
      <DriverForm t={t} />
    </div>
  );
}
