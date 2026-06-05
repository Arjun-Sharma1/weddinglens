"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePhotoStream } from "@/hooks/usePhotoStream";
import { useFullscreen } from "@/hooks/useFullscreen";
import { publicPhotoUrl } from "@/lib/storage";
import { QrPanel } from "@/components/QrPanel";
import type { EventRow, PhotoRow } from "@/lib/types";

const SPOTLIGHT_MS = 5000;

export function PhotoWall({
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
  const { photos, latestId } = usePhotoStream(event.id, initialPhotos);
  const { toggle } = useFullscreen();
  const [spotlight, setSpotlight] = useState<PhotoRow | null>(null);

  // 5-second spotlight whenever a brand-new photo arrives.
  useEffect(() => {
    if (!latestId) return;
    const photo = photos.find((p) => p.id === latestId);
    if (!photo) return;
    setSpotlight(photo);
    const t = setTimeout(() => setSpotlight(null), SPOTLIGHT_MS);
    return () => clearTimeout(t);
  }, [latestId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "f") toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  const total = photos.length;

  return (
    <main className="relative min-h-dvh w-full bg-night text-paper">
      {/* Header */}
      <header className="glass-dark sticky top-0 z-20 flex items-center justify-between border-x-0 border-t-0 px-6 py-4 md:px-10">
        <div>
          <p className="eyebrow text-gold-light">Live photo wall</p>
          <h1 className="font-display text-2xl leading-tight md:text-3xl">
            {event.name}
          </h1>
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            href={`/event/${event.slug}/upload`}
            className="focus-gold inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-gold-light transition hover:border-gold hover:bg-gold/10"
          >
            <CameraGlyph />
            Add a photo
          </Link>
          <div className="text-right">
            <div className="font-display text-2xl text-gold md:text-3xl">{total}</div>
            <div className="text-[0.65rem] uppercase tracking-[0.2em] text-paper/55">
              shared
            </div>
          </div>
          <div className="hidden rounded-xl bg-paper p-2 shadow-night ring-1 ring-gold/40 sm:block [&_svg]:h-16 [&_svg]:w-16">
            <div dangerouslySetInnerHTML={{ __html: qrMarkup }} />
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="flex min-h-[70dvh] items-center justify-center px-8">
          <QrPanel
            markup={qrMarkup}
            eventName={event.name}
            uploadHref={uploadHref}
            headline="Be the first to share a moment"
          />
        </div>
      ) : (
        <div className="columns-2 gap-3 p-3 sm:columns-3 lg:columns-4 xl:columns-5 [&>*]:mb-3">
          {photos.map((photo) => (
            <figure
              key={photo.id}
              className="animate-rise break-inside-avoid rounded-2xl bg-night-raised p-1.5 shadow-[0_22px_45px_-22px_rgba(0,0,0,0.9)] ring-1 ring-gold/10"
            >
              <div className="overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={publicPhotoUrl(photo.medium_path)}
                  alt=""
                  loading="lazy"
                  className="w-full object-cover transition duration-500 hover:scale-[1.03]"
                />
              </div>
            </figure>
          ))}
        </div>
      )}

      {/* Spotlight overlay for the latest arrival */}
      {spotlight && (
        <div className="animate-fade-in fixed inset-0 z-30 flex items-center justify-center bg-night/85 backdrop-blur-md">
          <div className="relative flex flex-col items-center px-6">
            <span className="eyebrow mb-5 text-gold-light">Just shared ♥</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={publicPhotoUrl(spotlight.display_path)}
              alt=""
              className="max-h-[78dvh] max-w-[90vw] rounded-2xl shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)] ring-1 ring-gold/30"
              style={{ animation: "pulse-soft 5s ease-in-out" }}
            />
          </div>
        </div>
      )}
    </main>
  );
}

function CameraGlyph() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.2-1.8A1 1 0 0 1 9 4.7h6a1 1 0 0 1 .8.5L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
