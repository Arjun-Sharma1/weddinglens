# WeddingLens Live

A real-time wedding photo wall. Guests scan a QR code, take a live photo from
their phone, and it appears on a TV/projector slideshow (or photo wall) within
seconds — no app, no sign-up. Organizers manage events and moderate photos from
an admin dashboard.

Built with **Next.js 16** (App Router, Turbopack) · **React 19** · **TypeScript**
· **Tailwind CSS v4** · **Supabase** (Postgres + Storage + Realtime) ·
**Auth.js** · **Sharp** · **qrcode** · **exifr** · **archiver**.

## How it works

```
Guest phone ──▶ POST /api/events/[slug]/photos  (server, service_role)
  (camera)        ├─ SHA-256 dedupe (unique per event)
                  ├─ EXIF "live photo" gate (reject >5 min old)
                  ├─ Sharp: thumb / medium / display + original
                  ├─ Supabase Storage (public bucket)
                  └─ insert photo row (approved | pending by mode)
                                   │
                       Supabase Realtime (postgres_changes, RLS = approved only)
                                   │
        ┌──────────────────────────┼──────────────────────────┐
     Slideshow                Photo wall                  Admin dashboard
  /event/[slug]/slideshow  /event/[slug]/wall                /admin
```

The browser only ever uses the **anon/publishable** key (RLS limits it to
*approved* photos). All writes go through server routes/actions holding the
**service_role** key, which never reaches the client.

## Setup

1. **Install**

   ```bash
   npm install
   ```

2. **Environment** — copy `.env.example` to `.env.local` and fill in:

   | Var | Where |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API (publishable) |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API (**secret**) |
   | `NEXT_PUBLIC_APP_URL` | e.g. `http://localhost:3000` (used for QR links) |
   | `ADMIN_USERNAME` / `ADMIN_PASSWORD` | organizer login |
   | `AUTH_SECRET` | `openssl rand -base64 32` |
   | `PHOTO_MAX_AGE_MINUTES` | live-photo cutoff (default `5`, `0` disables) |

3. **Database** — apply `supabase/schema.sql` to your project (Supabase SQL
   editor, the MCP server, or `psql`). It creates the `events`/`photos` tables,
   RLS policies (public read = approved only), the `photos` storage bucket, the
   realtime publication, and the `increment_display_count` function.

4. **Run**

   ```bash
   npm run dev
   ```

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing |
| `/event/[slug]` | Guest landing → camera |
| `/event/[slug]/upload` | Live camera capture + auto-upload |
| `/event/[slug]/slideshow` | Full-screen slideshow (QR every N, thank-you every 25, guest counter, `F` = fullscreen) |
| `/event/[slug]/wall` | Masonry photo wall with live spotlight |
| `/admin` | Organizer dashboard (events, stats) |
| `/admin/events/[id]/moderate` | Approve / reject / delete, bulk actions |
| `/api/events/[slug]/photos` | Upload pipeline |
| `/api/admin/events/[id]/download` | ZIP of originals + CSV report |

## Notes

- **Camera needs HTTPS.** `getUserMedia` only runs on `localhost` or HTTPS — for
  phone testing use a Vercel preview or a tunnel (e.g. `ngrok`). The page falls
  back to the native camera (`<input capture>`) when the live stream isn't
  available.
- **AI curation** is heuristic: brightness (luma mean) + sharpness (Laplacian
  variance) → `quality_score`, `is_blurry`, `is_dark`. Face/smile detection is
  intentionally out of scope (no hard ML dependency).
- **Test helpers** in `scripts/` exercise the upload pipeline, dedupe, and the
  EXIF gate against a running dev server.

## Deploy

Deploy to Vercel. Set the same environment variables in the project settings and
point `NEXT_PUBLIC_APP_URL` at the production domain so QR codes resolve.
