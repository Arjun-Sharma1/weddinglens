"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePhotoStream } from "@/hooks/usePhotoStream";
import { publicPhotoUrl } from "@/lib/storage";
import { useFullscreen } from "@/hooks/useFullscreen";
import { QrPanel } from "@/components/QrPanel";
import type { EventRow, PhotoRow } from "@/lib/types";

type Screen = "photo" | "qr" | "thanks";

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
  const { toggle: toggleFullscreen } = useFullscreen();

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
        timer = setTimeout(step, 5000);
        return;
      }

      const idx = shownRef.current % list.length;
      showPhoto(list[idx]);
      setScreen("photo");
      shownRef.current += 1;
      const count = shownRef.current;

      timer = setTimeout(() => {
        if (cancelled) return;
        if (count % 25 === 0) {
          setScreen("thanks");
          timer = setTimeout(step, 5000);
        } else if (count % qrEvery === 0) {
          setScreen("qr");
          timer = setTimeout(step, 20000);
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

      {/* Persistent chrome */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between p-8 md:p-10">
        <div className="font-display text-2xl tracking-tight text-paper/90 md:text-3xl">
          {event.name}
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

function PhotoLayer({ url, active }: { url?: string; active: boolean }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-1000 ease-in-out ${
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
