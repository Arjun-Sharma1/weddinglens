import Link from "next/link";
import type { Metadata } from "next";
import { Brand, Ornament } from "@/components/Brand";
import { DemoStage } from "@/components/DemoStage";

export const metadata: Metadata = {
  title: "See it in action — WeddingLens",
  description:
    "An interactive demo of the WeddingLens live photo wall: snap a photo as a guest and watch it land on the big screen in seconds.",
};

export default function DemoPage() {
  return (
    <main className="grain vignette relative min-h-dvh px-6 py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center">
        <Link href="/" className="focus-gold rounded-lg">
          <Brand withMark markSize={30} className="text-xl animate-fade-in" />
        </Link>

        <div className="mt-10 animate-rise">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-gold/45 bg-gold/10 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
            </span>
            <span className="eyebrow">Live demo — you drive</span>
          </span>
        </div>

        <h1 className="font-display mt-5 max-w-2xl text-balance text-center text-5xl leading-[1.05] text-ink md:text-6xl animate-rise">
          Snap a photo. Watch it go <span className="foil">live</span>.
        </h1>

        <p className="mt-5 max-w-md text-center text-lg text-ink-soft animate-rise">
          Follow one photo&rsquo;s journey in three acts — from a guest&rsquo;s
          phone, through your approval, to the big screen. You play every
          part.
        </p>

        {/* ── The interactive centerpiece ── */}
        <section className="mt-12 w-full animate-rise" aria-label="Interactive demo">
          <DemoStage />
        </section>

        {/* ── What's under the hood ── */}
        <section className="mt-16 w-full" aria-label="Features">
          <div className="flex items-center justify-center gap-3">
            <span className="rule-gold w-10" />
            <span className="eyebrow">Quietly taken care of</span>
            <span className="rule-gold w-10" />
          </div>
          <div className="stagger mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="card lift p-6"
                style={{ "--i": i } as React.CSSProperties}
              >
                <h2 className="font-display text-lg text-ink">{f.title}</h2>
                <p className="mt-1.5 text-sm text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="mt-20 flex flex-col items-center text-center">
          <p className="max-w-sm text-ink-soft">
            Ready to make every guest a{" "}
            <span className="foil">photographer</span> at your celebration?
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a href="mailto:a.sharma11@live.ca" className="btn btn-primary px-7 py-3.5">
              Get in touch
            </a>
            <Link href="/admin" className="btn btn-ghost px-6 py-3">
              Organizer studio
            </Link>
          </div>
        </section>

        <div className="mt-16 flex items-center gap-2 text-ink-faint">
          <Ornament />
          <span className="text-xs uppercase tracking-[0.2em]">
            Capture · Share · Celebrate
          </span>
          <Ornament />
        </div>
      </div>
    </main>
  );
}

const FEATURES = [
  {
    title: "Moderation, your way",
    body: "Approve each photo from your phone before it shows, or let them flow automatically — an AI content screen keeps anything inappropriate off the screen either way.",
  },
  {
    title: "Quality scoring",
    body: "Every upload is scored for sharpness and brightness, so blurry or dark shots are easy to filter out of the show.",
  },
  {
    title: "Live, not queued",
    body: "Displays update over a realtime connection the moment a photo is approved — no refreshing, no lag between moments.",
  },
  {
    title: "Keep every original",
    body: "After the night, download a ZIP of every full-quality original plus a report of the evening in one click.",
  },
];
