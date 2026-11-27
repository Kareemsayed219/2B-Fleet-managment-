import { getDict } from "@/lib/i18n";
import { setupManager } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/Notice";
import { LocaleToggle } from "@/components/LocaleToggle";

export default async function SetupPage({ searchParams }: PageProps<"/setup">) {
  const sp = await searchParams;
  const { t } = await getDict();
  const supabase = await createClient();
  const { data: needsSetup } = await supabase.rpc("needs_setup");

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-4 px-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.auth.setupTitle}</h1>
        <LocaleToggle label={t.nav.language} back="/setup" />
      </div>
      {!needsSetup ? (
        <div className="card flex flex-col gap-3">
          <Notice kind="info">{t.auth.setupDone}</Notice>
          <a className="btn" href="/login">{t.auth.submit}</a>
        </div>
      ) : (
        <form action={setupManager} className="card flex flex-col gap-3">
          <p className="text-sm text-muted">{t.auth.setupIntro}</p>
          {typeof sp.error === "string" ? <Notice kind="error">{sp.error}</Notice> : null}
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{t.auth.fullName}</span>
            <input className="input" name="full_name" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{t.auth.email}</span>
            <input className="input ltr" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-sm text-muted">{t.auth.password}</span>
            <input className="input ltr" name="password" type="password" minLength={8} autoComplete="new-password" required />
            <span className="text-xs text-muted">{t.auth.passwordHint}</span>
          </label>
          <button className="btn" type="submit">{t.auth.setupSubmit}</button>
        </form>
      )}
    </main>
  );
}
