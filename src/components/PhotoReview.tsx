"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { getCroppedImg } from "@/lib/cropImage";

/**
 * Review screen shown after a photo is captured/picked, before it uploads.
 * Pinch-zoom + drag to crop, rotate in 90° steps, then confirm or retake.
 *
 * Free aspect: the crop window matches the photo's own proportions, so at
 * zoom 1 the whole photo is kept (no crop) and zooming crops in. When the
 * photo is unedited we hand back the original bytes so EXIF survives.
 */
export function PhotoReview({
  src,
  original,
  onConfirm,
  onRetake,
}: {
  src: string;
  original: Blob;
  onConfirm: (blob: Blob) => void;
  onRetake: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [mediaAspect, setMediaAspect] = useState(4 / 3);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  // Flip the crop window's aspect on quarter turns so a pure rotate keeps the
  // whole frame.
  const aspect = rotation % 180 === 0 ? mediaAspect : 1 / mediaAspect;
  const edited = zoom !== 1 || rotation % 360 !== 0;

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPixels(pixels);
  }, []);

  const onMediaLoaded = useCallback(({ naturalWidth, naturalHeight }: MediaSize) => {
    if (naturalWidth && naturalHeight) setMediaAspect(naturalWidth / naturalHeight);
  }, []);

  const rotate = useCallback(() => {
    setRotation((r) => (r + 90) % 360);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  }, []);

  const confirm = useCallback(async () => {
    if (busy) return;
    if (!edited || !areaPixels) {
      onConfirm(original); // untouched → preserve original bytes (and EXIF)
      return;
    }
    setBusy(true);
    try {
      const blob = await getCroppedImg(src, areaPixels, rotation);
      onConfirm(blob ?? original);
    } catch {
      onConfirm(original);
    }
  }, [busy, edited, areaPixels, onConfirm, original, src, rotation]);

  return (
    <div className="animate-fade-in absolute inset-0 z-40 flex flex-col bg-night text-paper">
      {/* Cropper stage */}
      <div className="relative flex-1">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          minZoom={1}
          maxZoom={4}
          objectFit="contain"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          onMediaLoaded={onMediaLoaded}
          classes={{ containerClassName: "bg-night" }}
        />
      </div>

      {/* Controls */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 pb-9 pt-5">
        <input
          type="range"
          min={1}
          max={4}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label="Zoom"
          className="h-1 w-full max-w-xs cursor-pointer appearance-none rounded-full bg-paper/20 accent-gold"
        />

        <button
          onClick={rotate}
          className="focus-gold inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-paper/60 transition hover:text-paper"
        >
          <RotateGlyph />
          Rotate
        </button>

        <div className="flex w-full items-center justify-center gap-4">
          <button
            onClick={onRetake}
            disabled={busy}
            className="focus-gold rounded-full border border-paper/25 px-7 py-3 font-medium text-paper transition hover:border-gold hover:text-gold disabled:opacity-50"
          >
            Retake
          </button>
          <button
            onClick={confirm}
            disabled={busy}
            className="btn btn-gold px-8 py-3.5 disabled:opacity-60"
          >
            {busy ? "Preparing…" : "Use photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

function RotateGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
