"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fully simulated guest-to-big-screen demo. No Supabase, no network — a
 * bundled set of sample photos plays through the product's real sequence as
 * three acts on one stage: the guest snaps (1), the organizer approves (2),
 * the big screen shows it (3). The visitor drives every transition, and the
 * photo they snap is the thread that ties the acts together.
 */

type Sample = { src: string; portrait: boolean; quality: number };

const SAMPLES: Sample[] = [
  { src: "/demo/demo-01.webp", portrait: true, quality: 94 },
  { src: "/demo/demo-05.webp", portrait: false, quality: 91 },
  { src: "/demo/demo-02.webp", portrait: true, quality: 88 },
  { src: "/demo/demo-06.webp", portrait: false, quality: 96 },
  { src: "/demo/demo-03.webp", portrait: true, quality: 90 },
  { src: "/demo/demo-07.webp", portrait: false, quality: 93 },
  { src: "/demo/demo-04.webp", portrait: true, quality: 89 },
  { src: "/demo/demo-08.webp", portrait: false, quality: 95 },
];

// The wall starts with a few photos so the big screen never looks empty;
// the phone works through the rest and loops.
const WALL_SEED = [2, 1, 0];
const CURSOR_SEED = 3;

type Act = 1 | 2 | 3;
type Stage = "idle" | "uploading" | "screening" | "handoff";
type Mode = "manual" | "auto";
type View = "slideshow" | "wall";

const UPLOAD_MS = 650;
const SCREEN_MS = 750;
const HANDOFF_MS = 900;
const SPOTLIGHT_MS = 4500;
const SLIDE_MS = 3200;

const ACTS: { n: Act; label: string }[] = [
  { n: 1, label: "Snap" },
  { n: 2, label: "Approve" },
  { n: 3, label: "On screen" },
];

export function DemoStage() {
  const [act, setAct] = useState<Act>(1);
  // First-visit affordances (shutter pulse + "try it" chip) retire after the
  // visitor's first snap — they've learned the demo is live by then.
  const [hasSnapped, setHasSnapped] = useState(false);
  const [wall, setWall] = useState<number[]>(WALL_SEED); // newest first
  const [cursor, setCursor] = useState(CURSOR_SEED);
  const [pending, setPending] = useState<number | null>(null);
  const [rejected, setRejected] = useState(false);
  const [mode, setMode] = useState<Mode>("manual");
  const [stage, setStage] = useState<Stage>("idle");
  const [flash, setFlash] = useState(false);
  const [spotlight, setSpotlight] = useState<number | null>(null);
  const [view, setView] = useState<View>("slideshow");
  const [slide, setSlide] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const after = (ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  };

  const showOnWall = (idx: number) => {
    setWall((w) => [idx, ...w.filter((i) => i !== idx)]);
    setSpotlight(idx);
    setSlide(0); // the slideshow leads with the newest photo
    after(SPOTLIGHT_MS, () => setSpotlight((s) => (s === idx ? null : s)));
  };

  const snap = () => {
    if (stage !== "idle") return;
    setHasSnapped(true);
    const idx = cursor;
    setFlash(true);
    after(450, () => setFlash(false));
    setStage("uploading");
    after(UPLOAD_MS, () => setStage("screening"));
    after(UPLOAD_MS + SCREEN_MS, () => setStage("handoff"));
    after(UPLOAD_MS + SCREEN_MS + HANDOFF_MS, () => {
      setStage("idle");
      setCursor((c) => (c + 1) % SAMPLES.length);
      if (mode === "auto") {
        showOnWall(idx);
        setAct(3);
      } else {
        setPending(idx);
        setRejected(false);
        setAct(2);
      }
    });
  };

  const approve = () => {
    if (pending === null) return;
    showOnWall(pending);
    setPending(null);
    setAct(3);
  };

  const reject = () => {
    setPending(null);
    setRejected(true);
  };

  // Slideshow auto-advance while it's on stage.
  useEffect(() => {
    if (act !== 3 || view !== "slideshow") return;
    const t = setInterval(() => setSlide((s) => s + 1), SLIDE_MS);
    return () => clearInterval(t);
  }, [act, view]);

  const current = wall[slide % wall.length];
  const busy = stage !== "idle";

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* ── Act rail ── */}
      <div className="flex items-center justify-center">
        {ACTS.map((a, i) => (
          <div key={a.n} className="flex items-center">
            {i > 0 && (
              <span
                className={`mx-1.5 h-px w-5 transition-colors duration-500 sm:mx-2 sm:w-14 ${
                  act > a.n - 1 ? "bg-gold" : "bg-line"
                }`}
              />
            )}
            <button
              onClick={() => setAct(a.n)}
              aria-current={act === a.n ? "step" : undefined}
              aria-label={`Act ${a.n}: ${a.label}`}
              className={`focus-gold flex items-center gap-2 rounded-full px-2.5 py-1.5 transition sm:px-3 ${
                act === a.n
                  ? "bg-ink text-paper shadow-e2"
                  : "text-ink-soft hover:text-gold-deep"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full font-display text-xs ${
                  act === a.n
                    ? "bg-gold text-night"
                    : act > a.n
                      ? "bg-gold/25 text-gold-deep"
                      : "border border-line text-ink-faint"
                }`}
              >
                {a.n}
              </span>
              {/* On phones, only the active act keeps its label — the others
                  collapse to number chips so the rail always fits. */}
              <span
                className={`whitespace-nowrap text-sm font-medium ${
                  act === a.n ? "" : "max-sm:hidden"
                }`}
              >
                {a.label}
                {a.n === 2 && mode === "auto" && (
                  <span className="ml-1 text-[0.65rem] uppercase tracking-wide opacity-60">
                    auto
                  </span>
                )}
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* ── Stage ── */}
      <div className="mt-8 flex min-h-[540px] items-start justify-center">
        {act === 1 && (
          <div key="act1" className="animate-rise w-full text-center">
            <ActHeader
              eyebrow="Act one · The guest"
              title="Every guest is a photographer"
              body="Tap the shutter. The photo uploads straight from the browser — no app, no sign-up."
            />

            <div className="relative mx-auto mt-8 w-64 rounded-[2.6rem] bg-night p-2.5 shadow-e4 ring-1 ring-gold/25">
              <div className="relative overflow-hidden rounded-[2.1rem]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={SAMPLES[cursor].src}
                  alt="Phone camera viewfinder with the next sample photo"
                  className="aspect-[3/5] w-full object-cover"
                />

                {flash && (
                  <div className="animate-flash pointer-events-none absolute inset-0 bg-white" />
                )}

                {/* Pipeline overlay while a snap is in flight */}
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-3 bg-night/85 px-5 text-center transition-opacity duration-300 ${
                    busy ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  <PipelineStep
                    label="Uploading"
                    state={stepState(stage, "uploading")}
                  />
                  <PipelineStep
                    label="Screened · quality & content"
                    state={stepState(stage, "screening")}
                  />
                  <PipelineStep
                    label={
                      mode === "auto"
                        ? "Live on the big screen"
                        : "Sent to the organizer"
                    }
                    state={stepState(stage, "handoff")}
                  />
                </div>

                {!hasSnapped && !busy && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center">
                    <span className="animate-bounce rounded-full bg-gold px-3.5 py-1.5 text-xs font-semibold text-night shadow-gold">
                      Try it — tap the shutter
                    </span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-night/80 to-transparent pb-4 pt-10">
                  <button
                    onClick={snap}
                    disabled={busy}
                    aria-label="Snap a photo"
                    className="focus-gold relative grid h-16 w-16 place-items-center rounded-full border-2 border-paper/90 transition active:scale-95 disabled:opacity-50"
                  >
                    {!hasSnapped && (
                      <span className="absolute -inset-1 animate-ping rounded-full border-2 border-gold-light/80" />
                    )}
                    <span className="h-[3.2rem] w-[3.2rem] rounded-full bg-paper" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {act === 2 && (
          <div key="act2" className="animate-rise w-full text-center">
            <ActHeader
              eyebrow="Act two · The organizer"
              title="You have the final say"
              body={
                mode === "manual"
                  ? "With manual review on, every photo waits for your tap before it can appear."
                  : "Auto-approve is on — new photos skip this step and go straight to the screen."
              }
            />

            <div className="card mx-auto mt-8 max-w-sm p-5 text-left">
              <div className="flex items-center justify-between">
                <p className="eyebrow !text-[0.6rem]">Moderate photos</p>
                <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-medium text-white">
                  {pending !== null ? "1 pending" : "0 pending"}
                </span>
              </div>

              {pending !== null ? (
                <>
                  <div className="mt-4 overflow-hidden rounded-xl border border-line shadow-e2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={SAMPLES[pending].src}
                      alt="Guest photo awaiting your review"
                      className="max-h-72 w-full object-cover"
                    />
                  </div>
                  <p className="mt-3 text-xs text-ink-faint">
                    Quality {SAMPLES[pending].quality} · sharp · well-lit ·
                    content screen passed
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={approve}
                      className="focus-gold flex-1 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={reject}
                      className="focus-gold flex-1 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:border-amber-600 hover:text-amber-700"
                    >
                      Reject
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-line px-4 py-8 text-center text-sm text-ink-faint">
                  {rejected ? (
                    <>
                      Rejected — that photo never reaches the screen.
                      <br />
                      Guests are none the wiser.
                    </>
                  ) : (
                    "Nothing waiting. Snap a photo and it lands here first."
                  )}
                </div>
              )}

              {pending === null && (
                <button
                  onClick={() => setAct(1)}
                  className="btn btn-primary mt-4 w-full px-4 py-2.5 text-sm"
                >
                  Snap another photo
                </button>
              )}

              {/* Moderation mode — mirrors the real event setting */}
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                <span className="text-xs text-ink-faint">Moderation</span>
                <div
                  className="flex items-center gap-1 rounded-full border border-line bg-surface-sunk p-1"
                  role="group"
                  aria-label="Moderation mode"
                >
                  <ModePill
                    active={mode === "manual"}
                    onClick={() => setMode("manual")}
                  >
                    Manual
                  </ModePill>
                  <ModePill
                    active={mode === "auto"}
                    onClick={() => setMode("auto")}
                  >
                    Auto
                  </ModePill>
                </div>
              </div>
            </div>
          </div>
        )}

        {act === 3 && (
          <div key="act3" className="animate-rise w-full text-center">
            <ActHeader
              eyebrow="Act three · The big screen"
              title="Two ways to fill the room"
              body="The slideshow commands the dance floor; the wall works the cocktail hour. Every event gets both."
            />

            {/* View toggle — the slideshow / wall comparison */}
            <div
              className="mt-6 inline-flex items-center gap-1 rounded-full border border-line bg-surface-sunk p-1"
              role="group"
              aria-label="Display mode"
            >
              <ModePill
                active={view === "slideshow"}
                onClick={() => setView("slideshow")}
              >
                Slideshow
              </ModePill>
              <ModePill active={view === "wall"} onClick={() => setView("wall")}>
                Photo wall
              </ModePill>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl bg-night shadow-night ring-1 ring-gold/20">
              {view === "slideshow" ? (
                <div className="relative aspect-video w-full overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={current}
                    src={SAMPLES[current].src}
                    alt="Sample wedding moment on the demo slideshow"
                    className="animate-kenburns h-full w-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/30" />

                  {spotlight === current && (
                    <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.15em] text-night shadow-gold">
                      Just in
                    </span>
                  )}

                  <div className="absolute right-4 top-4 text-right">
                    <p className="eyebrow !text-[0.55rem] text-gold-light">
                      Live photo wall
                    </p>
                    <p className="font-display text-lg leading-tight text-paper/90">
                      Aria &amp; Sam&rsquo;s Wedding
                    </p>
                  </div>

                  <div className="absolute bottom-4 left-4 flex items-center gap-2.5">
                    <div className="rounded-lg bg-paper p-1 shadow-night ring-1 ring-gold/40">
                      <FakeQr />
                    </div>
                    <div className="text-left">
                      <p className="eyebrow !text-[0.55rem] text-gold-light">
                        Scan to join
                      </p>
                    </div>
                  </div>

                  <div className="absolute bottom-4 right-4">
                    <span className="font-display text-2xl text-gold">
                      {wall.length}
                    </span>
                    <span className="ml-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-paper/60">
                      shared tonight
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between border-b border-gold/15 px-5 py-3">
                    <div className="text-left">
                      <p className="eyebrow !text-[0.55rem] text-gold-light">
                        Live photo wall
                      </p>
                      <p className="font-display text-lg leading-tight text-paper/90">
                        Aria &amp; Sam&rsquo;s Wedding
                      </p>
                    </div>
                    <div>
                      <span className="font-display text-2xl text-gold">
                        {wall.length}
                      </span>
                      <span className="ml-1.5 text-[0.6rem] uppercase tracking-[0.2em] text-paper/60">
                        shared
                      </span>
                    </div>
                  </div>
                  {/* Columns widen as the wall fills so a young wall has no empty lanes. */}
                  <div
                    className={`gap-2.5 p-2.5 [&>*]:mb-2.5 ${
                      wall.length >= 6 ? "columns-3" : "columns-2"
                    }`}
                  >
                    {wall.map((idx) => (
                    <figure
                      key={idx}
                      className={`animate-rise break-inside-avoid overflow-hidden rounded-xl bg-night-raised p-1 transition-shadow duration-500 ${
                        spotlight === idx
                          ? "ring-2 ring-gold shadow-gold"
                          : "ring-1 ring-gold/10"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={SAMPLES[idx].src}
                        alt="Sample wedding moment on the demo photo wall"
                        className="w-full rounded-lg object-cover"
                      />
                    </figure>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button
              onClick={() => setAct(1)}
              className="btn btn-gold mt-6 px-7 py-3"
            >
              Snap another photo
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h3 className="font-display mt-2 text-3xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-ink-soft">{body}</p>
    </>
  );
}

function ModePill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`focus-gold rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
        active
          ? "bg-ink text-paper shadow-e2"
          : "text-ink-soft hover:text-gold-deep"
      }`}
    >
      {children}
    </button>
  );
}

/** Static stand-in QR so the slideshow chrome reads true without a server. */
function FakeQr() {
  const cells: [number, number][] = [
    [3, 0], [4, 0], [6, 0], [3, 1], [5, 1], [4, 2], [6, 2],
    [0, 3], [1, 3], [3, 3], [5, 3], [7, 3], [8, 3],
    [0, 4], [2, 4], [4, 4], [6, 4], [8, 4],
    [1, 5], [3, 5], [5, 5], [8, 5],
    [3, 6], [4, 6], [6, 6], [8, 6],
    [4, 7], [5, 7], [7, 7], [3, 8], [6, 8], [8, 8],
  ];
  return (
    <svg width="44" height="44" viewBox="0 0 9 9" aria-hidden>
      {/* finder squares */}
      {[[0, 0], [6, 0], [0, 6]].map(([x, y]) => (
        <g key={`${x}-${y}`} fill="#1b1714">
          <rect x={x} y={y} width="3" height="3" />
          <rect x={x + 1} y={y + 1} width="1" height="1" fill="#f8f3ea" />
        </g>
      ))}
      {cells.map(([x, y]) => (
        <rect key={`${x}.${y}`} x={x} y={y} width="1" height="1" fill="#1b1714" />
      ))}
    </svg>
  );
}

type StepState = "pending" | "active" | "done";

function stepState(stage: Stage, step: Exclude<Stage, "idle">): StepState {
  const order: Exclude<Stage, "idle">[] = ["uploading", "screening", "handoff"];
  const now = order.indexOf(stage as Exclude<Stage, "idle">);
  const mine = order.indexOf(step);
  if (now < 0 || mine > now) return "pending";
  return mine === now ? "active" : "done";
}

function PipelineStep({ label, state }: { label: string; state: StepState }) {
  return (
    <div
      className={`flex items-center gap-2 text-xs tracking-wide transition-opacity duration-300 ${
        state === "pending" ? "opacity-35" : "opacity-100"
      }`}
    >
      <span
        className={`grid h-4 w-4 place-items-center rounded-full border text-[0.55rem] ${
          state === "done"
            ? "border-gold bg-gold text-night"
            : state === "active"
              ? "animate-pulse border-gold-light text-gold-light"
              : "border-paper/40 text-transparent"
        }`}
      >
        ✓
      </span>
      <span className={state === "done" ? "text-gold-light" : "text-paper/85"}>
        {label}
      </span>
    </div>
  );
}
