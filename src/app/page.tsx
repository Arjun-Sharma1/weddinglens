import type { CSSProperties } from "react";
import Link from "next/link";
import { Brand, Ornament } from "@/components/Brand";

type PrintProps = CSSProperties & Record<"--r" | "--s" | "--d", string>;

const PRINTS: { tone: string; className: string; style: PrintProps }[] = [
  {
    tone: "print-gold",
    className: "hidden sm:block left-[5%] top-[13%]",
    style: { "--r": "-7deg", "--s": "6.5rem", "--d": "0.5s" },
  },
  {
    tone: "print-blush",
    className: "hidden sm:block right-[6%] top-[17%]",
    style: { "--r": "6deg", "--s": "7.5rem", "--d": "0.7s" },
  },
  {
    tone: "print-fawn",
    className: "hidden md:block left-[9%] top-[54%]",
    style: { "--r": "4deg", "--s": "7rem", "--d": "0.9s" },
  },
  {
    tone: "print-gold",
    className: "hidden md:block right-[8%] top-[58%]",
    style: { "--r": "-5deg", "--s": "6rem", "--d": "1.1s" },
  },
  {
    tone: "print-blush",
    className: "hidden lg:block left-[19%] bottom-[6%]",
    style: { "--r": "8deg", "--s": "5.5rem", "--d": "1.3s" },
  },
  {
    tone: "print-fawn",
    className: "hidden lg:block right-[18%] bottom-[8%]",
    style: { "--r": "-6deg", "--s": "6rem", "--d": "1.5s" },
  },
];

export default function Home() {
  return (
    <main className="grain vignette relative flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="prints-layer" aria-hidden>
        {PRINTS.map((p, i) => (
          <div key={i} className={`print ${p.tone} ${p.className}`} style={p.style}>
            <span />
          </div>
        ))}
      </div>

      <Brand withMark markSize={34} className="text-2xl animate-fade-in" />

      <div className="mt-12 flex items-center gap-3 animate-rise">
        <span className="rule-gold w-6 sm:w-12" />
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
        </span>
        <span className="eyebrow whitespace-nowrap">Live event photo slideshow</span>
        <span className="rule-gold w-6 sm:w-12" />
      </div>

      <h1
        className="font-display mt-6 max-w-3xl text-balance text-4xl leading-[1.02] text-ink sm:text-6xl md:text-7xl animate-rise"
        style={{ animationDelay: "0.1s" }}
      >
        Every guest, a <span className="foil foil-shimmer">photographer</span>.
      </h1>

      <p
        className="mt-6 max-w-md text-lg text-ink-soft animate-rise"
        style={{ animationDelay: "0.2s" }}
      >
        Guests scan a QR code, snap a photo, and it appears on the big screen in
        seconds. No app. No sign-up. Pure celebration.
      </p>

      <div
        className="mt-10 flex flex-wrap items-center justify-center gap-3 animate-rise"
        style={{ animationDelay: "0.3s" }}
      >
        <Link href="/demo" className="btn btn-gold px-7 py-3.5">
          See it in action
        </Link>
        <Link href="/admin" className="btn btn-ghost px-6 py-3">
          Organizer studio
        </Link>
      </div>

      <section
        className="mt-16 flex flex-col items-center animate-rise"
        style={{ animationDelay: "0.45s" }}
      >
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
