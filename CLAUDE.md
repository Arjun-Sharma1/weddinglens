# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The line above is load-bearing: this is **Next.js 16** (App Router, Turbopack) on **React 19**. Several conventions differ from older Next.js — read the relevant guide under `node_modules/next/dist/docs/` before writing routing/data-fetching code.

## Commands

```bash
npm run dev      # dev server (Next 16 + Turbopack) on :3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config, eslint-config-next)
```

There is no test runner. The `scripts/*.mjs` files are **manual E2E helpers** that hit a running dev server, not a unit suite:

```bash
node scripts/test-upload.mjs       # generate images w/ sharp, POST through the real upload route
node scripts/test-upload-one.mjs   # single upload
node scripts/test-exif.mjs         # exercise the EXIF live-photo gate
# Override target with env vars, e.g. SLUG=my-event BASE=http://localhost:3000
```

Database changes live in `supabase/schema.sql` (idempotent). Apply via the Supabase MCP `execute_sql`/`apply_migration`, the SQL editor, or `psql`. There is no local Supabase stack wired up — the app talks to a remote project.

## What this app is

A real-time wedding photo wall. Guests scan a QR code, take a **live** photo on their phone, and it appears on a TV slideshow / photo wall within seconds — no app, no sign-up. A single organizer manages events and moderates photos from `/admin`.

## Architecture

### The two-key security model (most important thing to understand)

Every data path is defined by **which Supabase key it uses**:

- **`service_role` key** (`src/lib/supabase/admin.ts`, `createAdminClient`) — bypasses RLS. Server-only (`import "server-only"`). Used by the upload pipeline, admin server actions, and admin route handlers. **Never import into a Client Component or expose the key.** All writes go through this.
- **anon key** — RLS-limited. Two flavors: `createPublicServerClient` (`public-server.ts`, Server Components / public reads) and `getBrowserClient` (`browser.ts`, Client Components + Realtime; singleton to avoid multiple sockets).

RLS (`supabase/schema.sql`) enforces the privacy guarantee: anon/public can only `select` photos where `status = 'approved'`. So Realtime and any browser query **physically cannot** see pending/rejected photos — unmoderated content never leaks to display surfaces. Don't undermine this by routing display reads through the admin client.

Admin auth is **Auth.js (NextAuth v5 beta) Credentials**, not Supabase Auth — a single organizer checked against `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars, JWT session, no DB adapter (`src/auth.ts`). Guard admin pages/actions with `requireAdmin()` (`src/lib/require-admin.ts`, redirects to `/admin/login`); route handlers call `auth()` directly and return 401.

### Photo ingestion pipeline

`src/lib/photo-ingest.ts` (`ingestPhoto`) is the **single shared pipeline** for both upload entry points. Steps: validate (≤20 MB, image/*) → SHA-256 dedupe (`unique(event_id, hash)`, idempotent) → optional EXIF freshness gate → Sharp renditions + quality scoring → upload renditions to Storage → insert row. Two callers, differing only by options:

- `POST /api/events/[slug]/photos` — **guest** uploads. `enforceFreshness: true` (rejects photos whose EXIF capture time is older than `PHOTO_MAX_AGE_MINUTES`, default 5) and `enforceNsfw: true`. Status follows the event's moderation mode (`manual` → pending, `auto` → approved) unless the NSFW screen flags it (forces `rejected`).
- `POST /api/admin/events/[id]/photos` — **moderator seed** uploads (auth'd). `enforceFreshness: false`, `enforceNsfw: false`, `forceStatus: "approved"`.

Image processing (`src/lib/images.ts`, Sharp) produces 4 renditions per photo — `original` (upright JPEG, EXIF stripped, for the download archive) + `thumb`/`medium`/`display` WebP — and heuristic quality signals: `brightness` (luma mean), `sharpness` (Laplacian variance), composite `quality_score` (0–100), `is_blurry`, `is_dark`. **No face detection.** The only ML is NSFW screening (see below); other ML is intentionally out of scope. Renditions land in the public `photos` Storage bucket; build URLs with `publicPhotoUrl()` (`src/lib/storage.ts`), never hardcode the CDN path.

NSFW screening (`src/lib/moderation.ts`, `screenForNsfw`) runs on **guest uploads only**: it encodes a ≤1024px JPEG (Rekognition's sync API needs JPEG/PNG ≤ 5 MB) and calls AWS Rekognition `DetectModerationLabels` with a 3s timeout. It flags only **explicit-sexual** top-level categories at `NSFW_MIN_CONFIDENCE` (default 80) — deliberately not suggestive/non-explicit-nudity/swimwear. A hit forces `status='rejected'` (RLS keeps rejected rows off every display); the guest still gets a normal success response. **Fails open** — missing AWS creds or any Rekognition error/timeout lets the photo through. Results are stored on the row as `nsfw_score`/`is_explicit`.

The EXIF gate (`src/lib/exif.ts`): photos **without** an EXIF timestamp pass (canvas-captured camera frames legitimately have none); only photos with a provably-old timestamp are rejected. `maxAgeMinutes <= 0` disables it.

### Real-time display

Display surfaces (`/event/[slug]/slideshow`, `/event/[slug]/wall`) are server-rendered with an initial approved-photo set, then subscribe via `usePhotoStream` (`src/hooks/usePhotoStream.ts`) to Supabase Realtime `postgres_changes` on `photos` filtered by `event_id`. It applies INSERT/UPDATE/DELETE deltas and tracks `latestId` for the spotlight. A **safety-net poll every 8s** re-fetches in case the socket drops. RLS guarantees only approved rows ever arrive.

### Data access & moderation

Read helpers are centralized in `src/lib/events.ts` (e.g. `getEventBySlug`, `getApprovedPhotos`, `getEventStats`) — prefer these over ad-hoc queries. Moderation actions (approve/reject/delete, bulk variants) are **server actions** in `src/app/admin/actions.ts`; each calls `requireAdmin()`, mutates via the admin client, deletes orphaned Storage objects on photo/event delete, and `revalidatePath()`s the affected admin routes. `display_count` is bumped through the `increment_display_count` SQL RPC (atomic; service_role only) via `POST /api/events/[slug]/displayed`.

### Layout & layers

- `src/lib/` — server-only domain logic (`"server-only"` where it must never reach the client): supabase clients, photo-ingest, images, exif, events, storage, qr, slug, format.
- `src/app/` — App Router. `(dashboard)` route group holds authed admin pages; `/admin/login` sits outside it. Dynamic params are **async** (`ctx.params` is a `Promise` — `await` it; this is a Next 16 convention).
- `src/components/` — UI; the realtime/camera ones are Client Components (`Slideshow`, `PhotoWall`, `CameraCapture`, `ModerationGrid`, `PhotoReview`, `SeedUpload`).
- Path alias `@/*` → `src/*`.

## Conventions & gotchas

- **Camera needs HTTPS.** `getUserMedia` only runs on `localhost` or HTTPS. For phone testing use a Vercel preview or a tunnel. The upload page falls back to native `<input capture>` when the live stream is unavailable.
- Upload/download/displayed route handlers set `runtime = "nodejs"` (Sharp/archiver/streaming need Node, not Edge) and `dynamic = "force-dynamic"`.
- The download route (`/api/admin/events/[id]/download`) **streams** a ZIP of originals + a CSV report via `archiver`. Note the `ZipArchive` typed-cast shim — `@types/archiver` v7 predates archiver 8's API.
- `EventRow`/`PhotoRow`/enums in `src/lib/types.ts` mirror `supabase/schema.sql` by hand. **Keep them in sync** when changing the schema.
- Env vars (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (secret, never `NEXT_PUBLIC_`), `NEXT_PUBLIC_APP_URL` (QR link base), `ADMIN_USERNAME`/`ADMIN_PASSWORD`, `AUTH_SECRET`, `PHOTO_MAX_AGE_MINUTES`, and (NSFW screening) `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`/`NSFW_MIN_CONFIDENCE`.
