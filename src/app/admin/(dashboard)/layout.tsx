import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/require-admin";
import { signOut } from "@/auth";
import { Brand } from "@/components/Brand";

export const metadata: Metadata = {
  title: { absolute: "Studio · WeddingLens Live" },
  description: "Organizer studio for WeddingLens Live.",
  robots: { index: false, follow: false },
  openGraph: { siteName: "WeddingLens Live", title: "Studio · WeddingLens Live" },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  async function doSignOut() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="grain relative min-h-dvh">
      <header className="glass sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Brand withMark markSize={26} className="text-lg" />
            <span className="hidden text-xs uppercase tracking-[0.25em] text-ink-faint sm:inline">
              Studio
            </span>
          </Link>
          <form action={doSignOut}>
            <button className="btn btn-ghost px-4 py-2 text-sm">Sign out</button>
          </form>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
