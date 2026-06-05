import Link from "next/link";
import { Brand, Ornament } from "@/components/Brand";

export default function Home() {
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Brand className="text-2xl" />

      <div className="mt-12 flex items-center gap-3">
        <span className="rule-gold w-12" />
        <span className="eyebrow">Live wedding photo wall</span>
        <span className="rule-gold w-12" />
      </div>

      <h1 className="font-display mt-6 max-w-3xl text-balance text-6xl leading-[1.02] text-ink md:text-7xl">
        Every guest, a <span className="foil">photographer</span>.
      </h1>

      <p className="mt-6 max-w-md text-lg text-ink-soft">
        Guests scan a QR code, snap a photo, and it appears on the big screen in
        seconds. No app. No sign-up. Pure celebration.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/admin"
          className="focus-gold rounded-full bg-ink px-7 py-3.5 font-medium text-paper transition hover:bg-gold-deep"
        >
          Organizer studio
        </Link>
      </div>

      <div className="mt-16 flex items-center gap-2 text-ink-faint">
        <Ornament />
        <span className="text-xs uppercase tracking-[0.2em]">
          Capture · Share · Celebrate
        </span>
        <Ornament />
      </div>
    </main>
  );
}
