# Demo Page — Design

**Date:** 2026-07-20
**Status:** Approved (demo type + photo sourcing confirmed by organizer)

## Goal

The landing page currently funnels every visitor to the organizer studio. Add a
public `/demo` page that lets a prospective client *experience* the product —
guest snaps a photo, it appears on the big screen — without an account, a
database row, or a phone.

## Decisions

- **Fully simulated, client-side.** No Supabase reads/writes, no Storage, no
  Realtime. Zero abuse surface, zero upkeep, works offline/forever.
- **Sample photos are AI-generated** wedding-style images bundled under
  `public/demo/` (WebP, ~900px). Swappable for real photos later by replacing
  files.

## Page structure (`/demo`)

1. **Hero** — brand, eyebrow, headline, one line of copy. Light (paper) world,
   consistent with the landing page.
2. **Interactive demo (the centerpiece)** — a phone mockup beside a TV mockup:
   - The phone shows a "viewfinder" (the next sample photo) with a shutter
     button. Tapping the shutter runs a short staged pipeline — *Uploading →
     Screened → Live* — mirroring the real ingest steps (dedupe/NSFW/quality
     are name-checked, not simulated).
   - The photo then appears on the TV: a mini photo wall (masonry-ish grid)
     with a brief gold "spotlight" on the newest photo and a live `n shared`
     counter — the same visual language as the real wall/slideshow.
   - A few photos are pre-seeded on the TV so it never looks empty; the phone
     cycles through the remaining bundled shots and loops.
3. **How it works** — three static steps (Scan the QR → Snap → On the big
   screen in seconds) using the existing card/eyebrow/rule-gold language.
4. **Feature highlights** — small cards: moderation (manual/auto + NSFW
   screen), live via Realtime, quality scoring, ZIP download of originals.
5. **CTA** — contact + organizer studio buttons.

## Addendum (same day): organizer/admin demo

The demo also plays the organizer side. `DemoStage` gains a moderation panel
styled after the real admin `ModerationGrid` (card surface, pending badges,
emerald Approve / amber Reject quick actions) plus a **Manual review /
Auto-approve** toggle mirroring the event's moderation setting:

- Manual (default): snapped photos finish their pipeline as "Sent to the
  organizer" and enter a pending queue in the panel. Approve → the photo lands
  on the TV with the spotlight; Reject → it disappears (never shown), matching
  the real RLS guarantee.
- Auto: snapped photos go straight to the TV as before. Photos already
  pending stay pending — the mode affects new uploads only, like the real app.
- The queue is seeded with two pending photos so the panel is interactive
  before the first snap.

## Addendum 2 (same day): sequential three-act redesign

Feedback: the side-by-side layout read as scattered; the slideshow display
mode wasn't shown. Redesigned the interactive demo as **one photo's journey**
on a single stage:

- A clickable **act rail** (1 Snap → 2 Approve → 3 On screen) with gold
  connectors that fill as you progress; only one scene is on stage at a time,
  and completing an act auto-advances to the next.
- **Act 1 — the guest:** centered phone, camera-flash animation on snap, then
  the staged pipeline overlay.
- **Act 2 — the organizer:** a review card for the photo just snapped, with
  its quality signals (score / sharp / well-lit / content screen) and
  Approve / Reject. The manual–auto toggle lives here; auto mode skips this
  act (the rail shows an "auto" tag).
- **Act 3 — the big screen:** a **Slideshow / Photo wall toggle** — the
  comparison. Slideshow is a cinematic 16:9 view (Ken Burns drift, crossfade,
  "Just in" badge on the newest photo, event chrome, stand-in QR, shared
  count); the wall is the masonry grid, columns widening as it fills.
  "Snap another photo" loops back to Act 1.
- The static "How it works" card section was removed — the acts teach the
  sequence now.
- New global keyframes `kenburns` and `flash-out` in `globals.css`.

## Landing page change

Add a second button next to "Organizer studio": **"See it in action"** →
`/demo` (ghost style so the studio CTA stays primary).

## Components & files

- `src/app/demo/page.tsx` — server component: metadata + static sections;
  renders the interactive piece.
- `src/components/DemoStage.tsx` — `"use client"`; owns all demo state
  (photo queue, wall list, pipeline stage, counter). Pure React state +
  timeouts; imports nothing from `src/lib` server modules.
- `public/demo/demo-01.webp … demo-08.webp` — bundled sample photos; the list
  is a hardcoded array in `DemoStage`.

## Error handling / edge cases

- Static assets only — no network failure modes beyond image 404s (browser
  default alt handling; images are bundled so this can't happen in practice).
- `prefers-reduced-motion` is already globally handled in `globals.css`
  (animations collapse to ~0ms); timeouts still advance state so the demo
  remains functional.
- Queue exhaustion: loop back to the first sample photo; the wall caps at the
  full sample set (re-snapped photos aren't duplicated).

## Testing

No unit runner exists in this repo. Verification = `npm run lint`,
`npm run build`, and a manual pass in the dev server (snap several photos,
watch the pipeline stages and wall updates, check mobile layout stacking).

## Out of scope

Real uploads, sandbox events, camera access, Supabase anything, changes to
existing display components.
