# NSFW Moderation via AWS Rekognition — Design

**Date:** 2026-06-25
**Status:** Approved, pending implementation

## Problem

The photo-ingestion pipeline has no content-safety check. In `auto` moderation
mode, guest photos go straight to `approved` and onto the live slideshow / wall
with no human in the loop. A bad actor could push explicit content to a TV in
front of wedding guests. CLAUDE.md currently records "no face/ML detection —
intentionally out of scope"; this design deliberately reverses that for the
narrow purpose of NSFW screening.

## Goal

Screen guest-uploaded photos for explicit/sexual content using AWS Rekognition
`DetectModerationLabels`, and silently reject anything that trips the threshold
so it never reaches a display surface.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Action on flag | **Reject outright** — insert row as `status='rejected'`. |
| Failure mode | **Fail open** — any AWS error/timeout/missing creds → photo proceeds through normal moderation. |
| Scope | **Guest uploads only** — moderator seed uploads (authenticated, trusted) skip the check. |
| Guest feedback | **Normal success response** — no special error; avoids tipping off bad actors and avoids embarrassing false positives. |
| Sensitivity | Flag only **explicit-sexual** top-level categories. Do NOT flag merely suggestive / non-explicit nudity / swimwear (weddings have beach/pool/kissing shots). |

## Architecture

### New module: `src/lib/moderation.ts` (`"server-only"`)

Exposes a single function:

```ts
screenForNsfw(buffer: Buffer): Promise<NsfwResult>
```

```ts
type NsfwResult = {
  ran: boolean;        // false if the check was skipped/unavailable (fail-open)
  isExplicit: boolean; // true if an explicit category exceeded the threshold
  score: number | null; // max explicit-category confidence (0..100), null if !ran
};
```

Responsibilities:
1. If `AWS_REGION` / `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` are not all
   present → return `{ ran: false, isExplicit: false, score: null }` (no-op,
   keeps local dev working without AWS).
2. Sharp-resize the input buffer to a **max ~1024px JPEG** (Rekognition's sync
   API requires JPEG/PNG ≤ 5 MB; our renditions are WebP and originals can be
   20 MB).
3. Call `DetectModerationLabels` with `MinConfidence = NSFW_MIN_CONFIDENCE`
   (default 80), wrapped in a ~3s timeout.
4. Inspect returned `ModerationLabels`. Compute the max confidence among labels
   whose top-level category is explicit-sexual (e.g. `Explicit Nudity` /
   `Explicit` / `Sexual Activity` — match on the current Rekognition taxonomy).
   `isExplicit = maxScore >= NSFW_MIN_CONFIDENCE`.
5. On any thrown error or timeout → return `{ ran: false, ... }` (fail open),
   after logging.

### Pipeline integration: `src/lib/photo-ingest.ts`

- Add `enforceNsfw: boolean` to `IngestOptions`.
- Guest route passes `enforceNsfw: true`; seed route passes `enforceNsfw: false`.
- After `processImage` succeeds, if `enforceNsfw`, call `screenForNsfw(buffer)`.
- If `result.isExplicit` → the inserted row's status is forced to `rejected`
  (this overrides the moderation-derived status, but `forceStatus` is still
  honored for the seed path which never runs the check).
- Persist `nsfw_score = result.score` and `is_explicit = result.isExplicit` on
  the row regardless of outcome.
- Renditions still upload normally; the row is still inserted. RLS guarantees a
  `rejected` row never reaches any anon/public read, Realtime, or display.
- The route returns its normal success result (the existing `IngestResult`
  `{ ok: true, ... }` shape is unchanged from the caller's perspective).

### Route wiring

- `POST /api/events/[slug]/photos` (guest): `enforceNsfw: true`.
- `POST /api/admin/events/[id]/photos` (seed): `enforceNsfw: false`.

## Data model

Add to `public.photos` (idempotent migration in `supabase/schema.sql`) and
mirror in `src/lib/types.ts` `PhotoRow`:

```sql
alter table public.photos
  add column if not exists nsfw_score  numeric,
  add column if not exists is_explicit boolean not null default false;
```

- `nsfw_score numeric` — max explicit-category confidence (null if check didn't run).
- `is_explicit boolean not null default false` — whether it tripped the threshold.

No RLS change needed: the existing `status = 'approved'` policy already hides
rejected rows from every public/anon read.

## Configuration (env)

| Var | Purpose | Default |
| --- | --- | --- |
| `AWS_REGION` | Rekognition region | — (absent → no-op) |
| `AWS_ACCESS_KEY_ID` | IAM creds | — |
| `AWS_SECRET_ACCESS_KEY` | IAM creds | — |
| `NSFW_MIN_CONFIDENCE` | confidence threshold to flag | `80` |

IAM principal needs only `rekognition:DetectModerationLabels`. Add the new vars
to `.env.example`, local `.env.local`, and Vercel.

New dependency: `@aws-sdk/client-rekognition`.

## Error handling & performance

- Missing creds → silent no-op (fail open). Local dev needs no AWS.
- AWS error / non-2xx / timeout (~3s) → fail open, logged.
- Cost: ~$1 / 1,000 images. Latency: one extra Sharp JPEG pass (~tens of ms) +
  one Rekognition round-trip (~200–500ms) on guest uploads only.

## Out of scope

- Front-end / client-side gate (explicitly dropped).
- Non-sexual moderation categories (violence, gore, drugs).
- Re-screening existing photos / backfill.
- Surfacing rejected NSFW photos in the admin UI (the columns make it possible
  later, but no UI work here).
