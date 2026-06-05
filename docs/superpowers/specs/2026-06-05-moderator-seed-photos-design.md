# Moderator seeds initial event photos

**Date:** 2026-06-05
**Status:** Approved

## Goal

Let an authenticated moderator upload existing photos (from their device library)
into an event so the slideshow / photo wall isn't empty before guests arrive.

Confirmed decisions:

- **Entry point:** the moderate page (`/admin/events/[id]/moderate`).
- **Freshness gate:** skipped for moderator uploads (the live-photo EXIF check that
  rejects photos older than ~5 min). Seeding is the opposite of a live guest capture.
- **Status:** moderator-uploaded photos are always inserted as `approved`, regardless
  of the event's moderation mode, so they appear immediately.

## Architecture

The guest route (`/api/events/[slug]/photos`) and the new moderator route share ~90%
of their logic. The shared pipeline is **extracted into one helper** rather than
duplicated, keeping the guest path's behavior identical.

### 1. `src/lib/photo-ingest.ts` (new)

`ingestPhoto(file, event, opts)` encapsulates: size/type validation → sha256 dedup →
EXIF `capturedAt` extraction → optional freshness gate → `processImage` renditions →
upload renditions to Storage (with rollback on failure) → insert photo row.

```ts
type IngestResult =
  | { ok: true; id: string; status: PhotoStatus; duplicate: boolean }
  | { ok: false; httpStatus: number; error: string; stale?: boolean };

interface IngestOptions {
  enforceFreshness: boolean;   // guest: true, moderator: false
  forceStatus?: PhotoStatus;   // moderator: "approved"; omit to follow event.moderation
}
```

`capturedAt` is still *extracted* for metadata even when `enforceFreshness` is false —
only the *rejection* is skipped.

### 2. Guest route refactor

`/api/events/[slug]/photos` calls `ingestPhoto(file, event, { enforceFreshness: true })`
and maps the result to its existing JSON shape (`pending`, `duplicate`, `stale`). No
behavior change.

### 3. `src/app/api/admin/events/[id]/photos/route.ts` (new)

`POST`, keyed by event **id** (matches the admin `/download` route convention).
Calls `auth()` → returns **401 JSON** if no session (not a redirect; consumed by fetch).
Looks up the event by id, then
`ingestPhoto(file, event, { enforceFreshness: false, forceStatus: "approved" })`.
Accepts one `photo` per request.

### 4. `src/components/SeedUpload.tsx` (new)

Client component rendered in the moderate page header (receives `eventId`).

- "Upload photos" button → hidden `<input type="file" accept="image/*" multiple>`.
- On pick: loop files, `POST` each to the admin endpoint **sequentially**, tracking
  `done/total` progress. Originals upload as-is (no client downscale) to preserve
  archival quality; oversized files (>20 MB) surface as a per-file error from the server.
- On completion: `router.refresh()` to repopulate the grid; inline summary like
  `"7 added · 1 already there · 1 failed"`.

One-request-per-file (vs. one bulk request) gives natural progress and reuses the
single-file pipeline with no serverless body-size cliff.

### 5. Moderate page edit

`src/app/admin/(dashboard)/events/[id]/moderate/page.tsx` renders `<SeedUpload eventId>`
in the header area.

## Error handling

Per-file failures don't abort the batch; each file's outcome (added / duplicate / error)
is collected and summarized. Storage-upload failure inside `ingestPhoto` rolls back
already-uploaded renditions. Unique-constraint race → treated as duplicate.

## Testing

No test runner is configured (`lint` / `build` only). Verification:

- `npm run lint` + `npm run build` clean.
- Manual: seed photos into a manual-review event → land as `approved`, appear in
  slideshow. An old (>5 min) photo is accepted here but still rejected on the guest path.
  A duplicate is reported as such.

## Files

- **new** `src/lib/photo-ingest.ts`
- **edit** `src/app/api/events/[slug]/photos/route.ts`
- **new** `src/app/api/admin/events/[id]/photos/route.ts`
- **new** `src/components/SeedUpload.tsx`
- **edit** `src/app/admin/(dashboard)/events/[id]/moderate/page.tsx`
