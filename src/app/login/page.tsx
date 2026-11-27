import { redirect } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { getMe } from "@/lib/auth";
import { signIn, signOut } from "@/app/actions";
import { LocaleToggle } from "@/components/LocaleToggle";
import { Notice } from "@/components/Notice";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const { t } = await getDict();
  const me = await getMe();
  if (me?.active) redirect("/");
  const supabase = await createClient();
  const { data: needsSetup } = await supabase.rpc("needs_setup");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.appName}</h1>
        <LocaleToggle label={t.nav.language} back="/login" />
      </div>
      {me && !me.active ? (
        <div className="card flex flex-col gap-3">
          <Notice kind="info">{t.auth.pending}</Notice>
          <form action={signOut}>
            <button className="btn-ghost">{t.nav.signOut}</button>
          </form>
        </div>
      ) : (
        <form action={signIn} className="card flex flex-col gap-3">
          <h2 className="text-lg font-medium">{t.auth.title}</h2>
          {sp.failed ? <Notice kind="error">{t.auth.failed}</Notice> : null}
          {sp.confirm ? <Notice kind="info">Check your email to confirm the account, then sign in.</Notice> : null}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{t.auth.login}</span>
            <input className="input ltr" name="login" autoComplete="username" inputMode="text" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{t.auth.password}</span>
            <input className="input ltr" name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="btn" type="submit">{t.auth.submit}</button>
          {needsSetup ? (
            <a className="text-sm text-accent underline" href="/setup">{t.auth.setupTitle}</a>
          ) : null}
        </form>
      )}
    </main>
  );
}
