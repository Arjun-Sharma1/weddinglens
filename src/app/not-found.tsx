import Link from "next/link";
import { Brand, Ornament } from "@/components/Brand";

export default function NotFound() {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Brand className="text-2xl" />
      <div className="mt-10 flex items-center gap-3">
        <Ornament />
        <span className="eyebrow">Not found</span>
        <Ornament />
      </div>
      <h1 className="font-display mt-4 text-4xl text-ink">
        This page has wandered off
      </h1>
      <p className="mt-3 max-w-sm text-ink-soft">
        The event or page you’re looking for doesn’t exist or may have been
        removed.
      </p>
      <Link
        href="/"
        className="focus-gold mt-8 rounded-full border border-line px-6 py-3 text-sm font-medium text-ink transition hover:border-gold hover:text-gold-deep"
      >
        Back home
      </Link>
    </main>
  );
}
