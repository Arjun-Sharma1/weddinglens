import "server-only";
import { createPublicServerClient } from "@/lib/supabase/public-server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { EventRow, PhotoRow, EventStats } from "@/lib/types";

/** Public event lookup by slug (RLS-safe, anon). */
export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<EventRow>();
  return data ?? null;
}

/** Approved photos for a display surface, newest first. */
export async function getApprovedPhotos(
  eventId: string,
  limit = 500,
): Promise<PhotoRow[]> {
  const supabase = createPublicServerClient();
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

/** Admin: all events (newest first). */
export async function getAllEvents(): Promise<EventRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Admin: every photo for an event (all statuses), newest first. */
export async function getEventPhotosAll(eventId: string): Promise<PhotoRow[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Admin: single event by id. */
export async function getEventById(id: string): Promise<EventRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle<EventRow>();
  return data ?? null;
}

/** Aggregate statistics for an event's dashboard. */
export async function getEventStats(eventId: string): Promise<EventStats> {
  const supabase = createAdminClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since15m = new Date(Date.now() - 15 * 60_000).toISOString();

  const countQuery = () =>
    supabase
      .from("photos")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

  const [totalUploads, uploadsToday, activeGuests, pending, approved, rejected] =
    await Promise.all([
      countQuery(),
      countQuery().gte("created_at", startOfToday.toISOString()),
      countQuery().gte("created_at", since15m),
      countQuery().eq("status", "pending"),
      countQuery().eq("status", "approved"),
      countQuery().eq("status", "rejected"),
    ]).then((results) => results.map((r) => r.count ?? 0));

  // "Photos displayed" — sum of display_count across approved photos.
  const { data: rows } = await supabase
    .from("photos")
    .select("display_count")
    .eq("event_id", eventId)
    .eq("status", "approved");
  const photosDisplayed = (rows ?? []).reduce(
    (sum, r) => sum + (r.display_count ?? 0),
    0,
  );

  return {
    totalUploads,
    uploadsToday,
    activeGuests,
    photosDisplayed,
    pending,
    approved,
    rejected,
  };
}
