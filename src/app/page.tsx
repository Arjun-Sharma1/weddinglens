import Link from "next/link";
import { Brand, Ornament } from "@/components/Brand";

export default function Home() {
  return (
    <main className="grain vignette relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <Brand withMark markSize={34} className="text-2xl animate-fade-in" />

      <div className="mt-12 flex items-center gap-3 animate-rise">
        <span className="rule-gold w-12" />
        <span className="eyebrow">Live wedding photo wall</span>
        <span className="rule-gold w-12" />
      </div>

      <h1 className="font-display mt-6 max-w-3xl text-balance text-6xl leading-[1.02] text-ink md:text-7xl animate-rise">
        Every guest, a <span className="foil">photographer</span>.
      </h1>

      <p className="mt-6 max-w-md text-lg text-ink-soft animate-rise">
        Guests scan a QR code, snap a photo, and it appears on the big screen in
        seconds. No app. No sign-up. Pure celebration.
      </p>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-rise">
        <Link href="/admin" className="btn btn-primary px-7 py-3.5">
          Organizer studio
        </Link>
      </div>

      <section className="mt-16 flex flex-col items-center animate-rise">
        <div className="flex items-center gap-3">
          <span className="rule-gold w-10" />
          <span className="eyebrow">Get in touch</span>
          <span className="rule-gold w-10" />
        </div>
        <p className="mt-5 max-w-sm text-ink-soft">
          Planning a celebration? Let&apos;s make every guest a{" "}
          <span className="foil">photographer</span>.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <a href="mailto:a.sharma11@live.ca" className="btn btn-ghost px-6 py-3">
            a.sharma11@live.ca
          </a>
          <a href="tel:+16472709911" className="btn btn-ghost px-6 py-3">
            647-270-9911
          </a>
        </div>
      </section>

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
