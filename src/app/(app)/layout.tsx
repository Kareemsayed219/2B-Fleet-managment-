import Link from "next/link";
import { requireUser, isStaffRole } from "@/lib/auth";
import { getDict } from "@/lib/i18n";
import { signOut } from "@/app/actions";
import { LocaleToggle } from "@/components/LocaleToggle";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireUser();
  const { t } = await getDict();
  const staff = isStaffRole(me.role);
  const links = [
    { href: "/", label: t.nav.home, show: true },
    { href: "/vehicles", label: t.nav.vehicles, show: staff },
    { href: "/drivers", label: t.nav.drivers, show: staff },
    { href: "/assignments", label: t.nav.assignments, show: staff },
    { href: "/users", label: t.nav.users, show: me.role === "manager" },
  ].filter((l) => l.show);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/" className="text-lg font-semibold">{t.appName}</Link>
          <nav className="flex flex-wrap gap-1 text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-md px-2 py-1 hover:bg-background">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="hidden text-sm text-muted sm:inline">
              {me.full_name} · {t.users.roles[me.role]}
            </span>
            <LocaleToggle label={t.nav.language} />
            <form action={signOut}>
              <button className="btn-ghost" type="submit">{t.nav.signOut}</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
