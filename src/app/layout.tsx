import type { Metadata, Viewport } from "next";
import { getDict } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDict();
  return { title: t.appName, description: "2B fleet management", manifest: "/manifest.webmanifest" };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#0b6bcb" };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dir } = await getDict();
  return (
    <html lang={locale} dir={dir} className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
