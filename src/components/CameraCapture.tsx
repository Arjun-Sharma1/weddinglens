"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Brand } from "@/components/Brand";

type Mode = "starting" | "live" | "fallback" | "uploading" | "success" | "error";

const MAX_EDGE = 1920; // downscale captured frame before upload
const STALE_HINT = "Please take a new photo instead of uploading an old one.";

export function CameraCapture({
  slug,
  eventName,
}: {
  slug: string;
  eventName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [mode, setMode] = useState<Mode>("starting");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [message, setMessage] = useState<string | null>(null);
  const [duplicate, setDuplicate] = useState(false);
  const [pending, setPending] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setMode("fallback");
      return;
    }
    setMode("starting");
    stopStream();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setMode("live");
    } catch {
      setMode("fallback");
    }
  }, [facing, stopStream]);

  useEffect(() => {
    startCamera();
    return stopStream;
  }, [startCamera, stopStream]);

  // ── Upload ──────────────────────────────────────────────
  const upload = useCallback(
    async (blob: Blob) => {
      setMode("uploading");
      setMessage(null);
      setDuplicate(false);
      setPending(false);
      const form = new FormData();
      form.append("photo", blob, "photo.jpg");
      try {
        const res = await fetch(`/api/events/${slug}/photos`, {
          method: "POST",
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setMessage(data?.error ?? "Something went wrong. Please try again.");
          setMode("error");
          return;
        }
        setDuplicate(Boolean(data?.duplicate));
        setPending(Boolean(data?.pending));
        setMode("success");
      } catch {
        setMessage("Network hiccup. Please try again.");
        setMode("error");
      }
    },
    [slug],
  );

  // ── Capture current video frame ─────────────────────────
  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const { videoWidth: w, videoHeight: h } = video;
    const scale = Math.min(1, MAX_EDGE / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => blob && upload(blob),
      "image/jpeg",
      0.9,
    );
  }, [upload]);

  const onFilePicked = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) upload(file);
      e.target.value = "";
    },
    [upload],
  );

  const reset = useCallback(() => {
    setMessage(null);
    if (streamRef.current) setMode("live");
    else startCamera();
  }, [startCamera]);

  return (
    <main className="relative flex min-h-dvh flex-col bg-night text-paper">
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-5 pt-5">
        <Brand className="text-base" onDark />
        <span className="max-w-[55%] truncate text-right text-xs uppercase tracking-[0.18em] text-paper/55">
          {eventName}
        </span>
      </header>

      {/* Viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${
            mode === "live" || mode === "uploading" ? "opacity-100" : "opacity-0"
          } ${facing === "user" ? "-scale-x-100" : ""}`}
        />

        {/* Corner frame guides */}
        {(mode === "live" || mode === "uploading") && (
          <div aria-hidden className="pointer-events-none absolute inset-6 z-10">
            {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map(
              (pos, i) => (
                <span
                  key={i}
                  className={`absolute h-7 w-7 border-gold/70 ${pos} ${
                    pos.includes("top") ? "border-t-2" : "border-b-2"
                  } ${pos.includes("left") ? "border-l-2" : "border-r-2"}`}
                />
              ),
            )}
          </div>
        )}

        {mode === "starting" && (
          <Centered>
            <Spinner />
            <p className="mt-4 text-sm text-paper/70">Opening the camera…</p>
          </Centered>
        )}

        {mode === "fallback" && (
          <Centered>
            <div className="max-w-xs text-center">
              <p className="font-display text-2xl">Let’s take a photo</p>
              <p className="mt-2 text-sm text-paper/65">
                Tap below to use your camera.
              </p>
              <label className="focus-gold mt-6 inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gold px-7 py-3.5 font-medium text-night">
                Open camera
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onFilePicked}
                />
              </label>
            </div>
          </Centered>
        )}

        {mode === "uploading" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-night/55 backdrop-blur-sm">
            <div className="text-center">
              <Spinner />
              <p className="mt-4 text-sm tracking-wide text-paper/80">
                Sending to the big screen…
              </p>
            </div>
          </div>
        )}

        {mode === "success" && (
          <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-night px-8">
            <div className="text-center">
              <SuccessMark />
              <h2 className="font-display mt-6 text-4xl">
                {duplicate ? "Already shared!" : "You’re on the wall!"}
              </h2>
              <p className="mt-3 text-paper/70">
                {pending
                  ? "Your photo is in line for a quick review, then it’s on screen."
                  : duplicate
                    ? "We already have this one — nicely done."
                    : "Look up — your moment is on the big screen."}
              </p>
              <button
                onClick={reset}
                className="focus-gold mt-9 inline-flex items-center justify-center gap-2 rounded-full bg-gold px-8 py-4 font-medium text-night transition hover:bg-gold-light"
              >
                Take another
              </button>
            </div>
          </div>
        )}

        {mode === "error" && (
          <div className="animate-fade-in absolute inset-0 z-30 flex items-center justify-center bg-night px-8">
            <div className="max-w-xs text-center">
              <p className="font-display text-3xl">Hmm.</p>
              <p className="mt-3 text-paper/75">{message}</p>
              {message === STALE_HINT && (
                <p className="mt-2 text-xs text-paper/50">
                  Live photos keep the celebration in the moment.
                </p>
              )}
              <button
                onClick={reset}
                className="focus-gold mt-8 rounded-full border border-paper/25 px-7 py-3 font-medium text-paper transition hover:border-gold hover:text-gold"
              >
                Try again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Shutter bar */}
      {(mode === "live" || mode === "uploading") && (
        <div className="relative z-20 flex items-center justify-center gap-10 px-6 pb-9 pt-6">
          <Link
            href={`/event/${slug}`}
            className="focus-gold text-xs uppercase tracking-[0.15em] text-paper/55 transition hover:text-paper"
          >
            Back
          </Link>

          <button
            onClick={takePhoto}
            disabled={mode !== "live"}
            aria-label="Take photo"
            className="focus-gold group relative grid h-20 w-20 place-items-center rounded-full disabled:opacity-50"
          >
            <span className="absolute inset-0 rounded-full ring-2 ring-paper/80 transition group-active:scale-95" />
            <span className="h-16 w-16 rounded-full bg-paper transition group-hover:bg-gold-light group-active:scale-90" />
          </button>

          <button
            onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}
            aria-label="Flip camera"
            className="focus-gold text-paper/55 transition hover:text-paper"
          >
            <FlipGlyph />
          </button>
        </div>
      )}
    </main>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span className="mx-auto block h-9 w-9 animate-spin rounded-full border-2 border-paper/25 border-t-gold" />
  );
}

function SuccessMark() {
  return (
    <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold/15 ring-1 ring-gold/50">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 12.5l4.2 4.2L19 7"
          stroke="var(--gold)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function FlipGlyph() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 7h13l-2.5-2.5M21 17H8l2.5 2.5" />
      <circle cx="12" cy="12" r="2.4" />
    </svg>
  );
}
