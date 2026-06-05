import Link from "next/link";
import { requireAdmin } from "@/lib/require-admin";
import { signOut } from "@/auth";
import { Brand } from "@/components/Brand";

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
      <header className="relative z-10 border-b border-line/70 bg-paper/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="flex items-center gap-3">
            <Brand className="text-lg" />
            <span className="hidden text-xs uppercase tracking-[0.25em] text-ink-faint sm:inline">
              Studio
            </span>
          </Link>
          <form action={doSignOut}>
            <button className="focus-gold rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition hover:border-gold hover:text-gold-deep">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
