# Photo review / crop / confirm before upload

**Date:** 2026-06-05
**Status:** Approved, ready for implementation

## Problem

In the guest camera flow (`src/components/CameraCapture.tsx`), taking a photo
uploads it immediately. Both capture paths call `upload(blob)` the moment a
frame is captured or a file is picked:

- `takePhoto()` draws the live video frame to a canvas and calls `upload()`.
- `onFilePicked()` (the no-`getUserMedia` fallback) calls `upload()` directly.

Guests get no chance to review framing, recrop, or retake before their photo
lands on the wall/slideshow.

## Goal

Insert a **review** stage between capture and upload that lets the guest:

- see the captured photo full-screen,
- **crop** (free aspect ratio, pinch-zoom + drag),
- **rotate** in 90° steps,
- **confirm** ("Use photo") to upload, or
- **retake** to discard and go back.

## Non-goals (YAGNI)

- Filters, brightness/contrast adjustment.
- Aspect-ratio presets (square, 4:3, etc.). Free crop only.
- Multi-photo selection / batch upload.

## Approach

Add a new `Mode` value `"review"` and pending-image state to `CameraCapture`.
Capturing a frame or picking a file no longer uploads — it stashes the image
and switches to `mode = "review"`, which renders a new `PhotoReview` component.

### Crop library

Use `react-easy-crop@^5` (peer deps `react >=16.4.0` — compatible with this
project's React 19). It provides touch-friendly pinch-zoom, drag-to-pan, and a
`rotation` prop, and returns pixel crop coordinates we render to a canvas.

### Components

**`src/components/PhotoReview.tsx`** (new, self-contained)

- Props: `{ src: string; onConfirm: (result: { blob: Blob; edited: boolean }) => void; onRetake: () => void }`
- Renders `<Cropper>` (free aspect) over the night background.
- Local state: `crop`, `zoom`, `rotation`, `croppedAreaPixels`.
- Rotate button advances `rotation` by 90°.
- "Use photo" → if no edit was made (zoom at 1, rotation 0, crop covers the
  whole image) call `onConfirm({ blob: <original>, edited: false })`; otherwise
  render the cropped/rotated region to a canvas, `toBlob` as JPEG q0.9, and call
  `onConfirm({ blob, edited: true })`.
- "Retake" → `onRetake()`.
- Styling matches the existing gold/night aesthetic (`btn btn-gold`, etc.).

**`src/components/CameraCapture.tsx`** (modified)

- `Mode` gains `"review"`.
- New state for the pending image: the source `Blob`/`File` and an object-URL
  for display. Create the object-URL when entering review; **revoke it** on
  retake, on confirm, and on unmount to avoid leaks.
- `takePhoto()` → instead of `upload(blob)`, stash the canvas blob + object-URL
  and set `mode = "review"`.
- `onFilePicked()` → instead of `upload(file)`, stash the file + object-URL and
  set `mode = "review"`.
- Render `<PhotoReview>` when `mode === "review"`, passing the object-URL and:
  - `onConfirm({ blob, edited })` → call existing `upload(blob)` (unchanged).
  - `onRetake()` → revoke URL, clear pending state, return to `live`
    (or re-open the file input on the fallback path).

## EXIF / stale-photo gate preservation

The API route (`src/app/api/events/[slug]/photos/route.ts`) rejects photos
whose EXIF capture time is older than `PHOTO_MAX_AGE_MINUTES`. Canvas
re-encoding strips EXIF, so a naive "always re-encode" would silently disable
the stale gate for gallery uploads.

Rule:

- **Confirm with no edits** → upload the **original source bytes** untouched.
  Gallery files keep their EXIF, so the stale gate still works. (Live-capture
  frames already have no EXIF — unchanged from today.)
- **Confirm after crop/rotate** → upload the re-encoded JPEG. EXIF is stripped,
  which is the expected, acceptable behavior for an edited image (same as
  today's live-capture path).

This is why `onConfirm` carries an `edited` flag derived from whether the user
actually changed zoom/rotation/crop.

## Unchanged

- `upload()` in `CameraCapture` — same signature, same call to the API.
- The API route, duplicate-hash detection, image processing, stale gate.
- `src/lib/exif.ts`, `src/lib/images.ts`.

## Files

- `package.json` — add `react-easy-crop@^5`.
- `src/components/PhotoReview.tsx` — new.
- `src/components/CameraCapture.tsx` — add review mode + pending state, wire up.

## Risks / edge cases

- **Object-URL leaks** — revoke on every exit from review.
- **"No edit" detection** — must correctly identify an untouched image so EXIF
  is preserved; when in doubt, treat as edited (re-encode) is the safe default
  for correctness of the crop, but loses EXIF — prefer accurate detection.
- **Fallback retake** — the file input must be re-openable after a retake.
- **Camera stream** — keep the live stream alive during review so retake is
  instant (no re-`getUserMedia`).
