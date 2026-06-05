-- WeddingLens Live — database schema, RLS, storage & realtime
-- Applied via the Supabase MCP `execute_sql`. Idempotent where practical.

-- ──────────────────────────────────────────────────────────────
-- Enums
-- ──────────────────────────────────────────────────────────────
do $$ begin
  create type event_mode as enum ('slideshow', 'wall');
exception when duplicate_object then null; end $$;

do $$ begin
  create type moderation_mode as enum ('auto', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type photo_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────
-- events
-- ──────────────────────────────────────────────────────────────
create table if not exists public.events (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  name             text not null,
  event_date       date,
  cover_image_path text,
  mode             event_mode      not null default 'slideshow',
  moderation       moderation_mode not null default 'auto',
  slide_seconds    int  not null default 8,
  qr_every         int  not null default 5,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- photos
-- ──────────────────────────────────────────────────────────────
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references public.events(id) on delete cascade,
  status        photo_status not null default 'approved',
  original_path text not null,
  thumb_path    text not null,
  medium_path   text not null,
  display_path  text not null,
  width         int,
  height        int,
  hash          text not null,
  captured_at   timestamptz,
  brightness    numeric,   -- 0..255 mean luma
  sharpness     numeric,   -- laplacian variance proxy
  quality_score numeric,   -- 0..100 composite for curation
  is_blurry     boolean not null default false,
  is_dark       boolean not null default false,
  display_count int not null default 0,
  created_at    timestamptz not null default now(),
  unique (event_id, hash)  -- exact-duplicate detection
);

create index if not exists photos_event_status_created_idx
  on public.photos (event_id, status, created_at desc);

-- ──────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────
alter table public.events enable row level security;
alter table public.photos enable row level security;

-- events: world-readable (guests + displays need event info).
-- Writes are server-side only via the service_role key (bypasses RLS).
drop policy if exists "events public read" on public.events;
create policy "events public read"
  on public.events for select
  to anon, authenticated
  using (true);

-- photos: anon/public can only read APPROVED rows. This is what Realtime
-- delivers to display pages, so unmoderated photos never leak.
drop policy if exists "photos public read approved" on public.photos;
create policy "photos public read approved"
  on public.photos for select
  to anon, authenticated
  using (status = 'approved');

-- Explicit grants (Data API access is separate from RLS).
grant select on public.events to anon, authenticated;
grant select on public.photos to anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- Atomic display_count increment (invoked only via service_role rpc)
-- ──────────────────────────────────────────────────────────────
create or replace function public.increment_display_count(photo_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.photos set display_count = display_count + 1 where id = photo_id;
$$;

-- Only the service_role should call this; revoke from public API roles.
revoke all on function public.increment_display_count(uuid) from anon, authenticated;

-- ──────────────────────────────────────────────────────────────
-- Realtime — broadcast photo changes to subscribed displays
-- ──────────────────────────────────────────────────────────────
do $$ begin
  alter publication supabase_realtime add table public.photos;
exception when duplicate_object then null; end $$;

-- ──────────────────────────────────────────────────────────────
-- Storage — public bucket for image renditions
-- (uploads happen via service_role which bypasses storage RLS;
--  a public bucket makes renditions readable via public CDN URLs)
-- ──────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do update set public = true;
