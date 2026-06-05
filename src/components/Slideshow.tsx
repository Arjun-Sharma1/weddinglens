"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePhotoStream } from "@/hooks/usePhotoStream";
import { publicPhotoUrl } from "@/lib/storage";
import { useFullscreen } from "@/hooks/useFullscreen";
import { QrPanel } from "@/components/QrPanel";
import type { EventRow, PhotoRow } from "@/lib/types";

type Screen = "photo" | "qr" | "thanks";

// Interstitial hold times. The QR is also pinned in the corner full-time, so the
// big QR screen is just an occasional nudge — keep it brief.
const QR_HOLD_MS = 5000;
const THANKS_HOLD_MS = 5000;
const EMPTY_RECHECK_MS = 5000;
const THANKS_EVERY = 25; // show the thank-you screen every N photos

export function Slideshow({
  event,
  initialPhotos,
  qrMarkup,
  uploadHref,
}: {
  event: EventRow;
  initialPhotos: PhotoRow[];
  qrMarkup: string;
  uploadHref: string;
}) {
  const { photos } = usePhotoStream(event.id, initialPhotos);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen();

  const [screen, setScreen] = useState<Screen>(photos.length ? "photo" : "qr");
  const [front, setFront] = useState<"a" | "b">("a");
  const [aUrl, setAUrl] = useState<string>();
  const [bUrl, setBUrl] = useState<string>();

  const photosRef = useRef(photos);
  photosRef.current = photos;
  const frontRef = useRef<"a" | "b">("a");
  const shownRef = useRef(0);
  const slideMs = Math.max(2, event.slide_seconds) * 1000;
  const qrEvery = Math.max(1, event.qr_every);

  const showPhoto = useCallback((photo: PhotoRow) => {
    const url = publicPhotoUrl(photo.display_path);
    const next = frontRef.current === "a" ? "b" : "a";
    if (next === "a") setAUrl(url);
    else setBUrl(url);
    frontRef.current = next;
    setFront(next);
    // Best-effort "displayed" stat.
    fetch(`/api/events/${event.slug}/displayed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: photo.id }),
      keepalive: true,
    }).catch(() => {});
  }, [event.slug]);

  // ── Scheduler: photo → (every 25th: thanks 5s) → (every qrEvery: qr 20s) ──
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const step = () => {
      if (cancelled) return;
      const list = photosRef.current;

      if (list.length === 0) {
        setScreen("qr");
        timer = setTimeout(step, EMPTY_RECHECK_MS);
        return;
      }

      const idx = shownRef.current % list.length;
      showPhoto(list[idx]);
      setScreen("photo");
      shownRef.current += 1;
      const count = shownRef.current;

      timer = setTimeout(() => {
        if (cancelled) return;
        if (count % THANKS_EVERY === 0) {
          setScreen("thanks");
          timer = setTimeout(step, THANKS_HOLD_MS);
        } else if (count % qrEvery === 0) {
          setScreen("qr");
          timer = setTimeout(step, QR_HOLD_MS);
        } else {
          step();
        }
      }, slideMs);
    };

    step();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Re-run only if timing config changes.
  }, [slideMs, qrEvery, showPhoto]);

  // Keyboard: F = fullscreen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") toggleFullscreen();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleFullscreen]);

  const total = photos.length;

  return (
    <main className="relative h-dvh w-screen overflow-hidden bg-night text-paper select-none">
      {/* Photo layers (crossfade) */}
      <div
        className={`absolute inset-0 transition-opacity duration-700 ${
          screen === "photo" ? "opacity-100" : "opacity-0"
        }`}
      >
        <PhotoLayer url={aUrl} active={front === "a"} />
        <PhotoLayer url={bUrl} active={front === "b"} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night/70 via-transparent to-night/30" />
      </div>

      {/* QR invite screen */}
      <Interstitial show={screen === "qr"}>
        <QrPanel
          markup={qrMarkup}
          eventName={event.name}
          uploadHref={uploadHref}
          headline="Take a photo and appear on the big screen!"
        />
      </Interstitial>

      {/* Thank-you screen */}
      <Interstitial show={screen === "thanks"}>
        <div className="text-center">
          <p className="eyebrow">With love</p>
          <h2 className="font-display mt-6 text-balance text-6xl leading-tight md:text-7xl">
            Thank you for celebrating
            <br />
            with us <span className="text-gold">♥</span>
          </h2>
        </div>
      </Interstitial>

      {/* Top chrome: fullscreen control (left) · event name (right) */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-8 md:p-10">
        <button
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
          className="focus-gold glass-dark pointer-events-auto grid h-11 w-11 place-items-center rounded-full text-paper/80 transition hover:text-gold"
        >
          {isFullscreen ? <ExitFullscreenGlyph /> : <FullscreenGlyph />}
        </button>

        <div className="text-right">
          <p className="eyebrow text-gold-light">Live photo wall</p>
          <div className="font-display text-2xl leading-tight tracking-tight text-paper/90 md:text-3xl">
            {event.name}
          </div>
        </div>
      </div>

      {/* Bottom chrome: scan-to-join QR (left) · live count (right) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-8 md:p-10">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-paper p-2.5 shadow-night ring-1 ring-gold/40 [&_svg]:h-20 [&_svg]:w-20 md:[&_svg]:h-24 md:[&_svg]:w-24">
            <div dangerouslySetInnerHTML={{ __html: qrMarkup }} />
          </div>
          <div className="hidden sm:block">
            <p className="eyebrow text-gold-light">Scan to join</p>
            <p className="mt-1 text-sm text-paper/70">Add your photo to the screen</p>
          </div>
        </div>

        {total > 0 && (
          <div className="text-right">
            <span className="font-display text-3xl text-gold md:text-4xl">
              {total}
            </span>
            <span className="ml-2 text-xs uppercase tracking-[0.2em] text-paper/60">
              photo{total === 1 ? "" : "s"} shared tonight
            </span>
          </div>
        )}
      </div>
    </main>
  );
}

function FullscreenGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v3" />
      <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function ExitFullscreenGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

function PhotoLayer({ url, active }: { url?: string; active: boolean }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`absolute inset-0 h-full w-full object-contain drop-shadow-[0_28px_55px_rgba(0,0,0,0.6)] transition-opacity duration-1000 ease-in-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
    />
  );
}

function Interstitial({
  show,
  children,
}: {
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`absolute inset-0 z-10 flex items-center justify-center bg-night px-10 transition-opacity duration-700 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* soft gold radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(194,161,91,0.14), transparent 70%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
