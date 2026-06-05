"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { slugify } from "@/lib/slug";
import { PHOTOS_BUCKET } from "@/lib/storage";
import type { PhotoStatus } from "@/lib/types";

export type FormState = { error?: string };

function readEventForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const eventDate = String(formData.get("event_date") ?? "").trim();
  const mode = String(formData.get("mode") ?? "slideshow");
  const moderation = String(formData.get("moderation") ?? "auto");
  const slideSeconds = Number(formData.get("slide_seconds") ?? 8);
  const qrEvery = Number(formData.get("qr_every") ?? 5);

  return {
    name,
    slug: slugify(rawSlug || name),
    event_date: eventDate || null,
    mode: mode === "wall" ? "wall" : "slideshow",
    moderation: moderation === "manual" ? "manual" : "auto",
    slide_seconds: Number.isFinite(slideSeconds) ? Math.max(2, slideSeconds) : 8,
    qr_every: Number.isFinite(qrEvery) ? Math.max(1, qrEvery) : 5,
  };
}

export async function createEvent(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const fields = readEventForm(formData);
  if (!fields.name || !fields.slug) {
    return { error: "Event name is required." };
  }

  const { data, error } = await supabase
    .from("events")
    .insert(fields)
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: `The link “/event/${fields.slug}” is already taken.` };
    }
    return { error: "Could not create the event." };
  }

  revalidatePath("/admin");
  redirect(`/admin/events/${data.id}`);
}

export async function updateEvent(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireAdmin();
  const supabase = createAdminClient();
  const fields = readEventForm(formData);
  if (!fields.name || !fields.slug) {
    return { error: "Event name is required." };
  }

  const { error } = await supabase.from("events").update(fields).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { error: `The link “/event/${fields.slug}” is already taken.` };
    }
    return { error: "Could not update the event." };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${id}`);
  redirect(`/admin/events/${id}`);
}

export async function deleteEvent(id: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  // Remove all stored objects for this event, then delete the row (cascade).
  const { data: photos } = await supabase
    .from("photos")
    .select("original_path, thumb_path, medium_path, display_path")
    .eq("event_id", id);

  const paths = (photos ?? []).flatMap((p) => [
    p.original_path,
    p.thumb_path,
    p.medium_path,
    p.display_path,
  ]);
  if (paths.length) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  }

  await supabase.from("events").delete().eq("id", id);
  revalidatePath("/admin");
  redirect("/admin");
}

// ── Moderation ──────────────────────────────────────────────

export async function setPhotoStatus(
  photoId: string,
  status: PhotoStatus,
  eventId: string,
) {
  await requireAdmin();
  const supabase = createAdminClient();
  await supabase.from("photos").update({ status }).eq("id", photoId);
  revalidatePath(`/admin/events/${eventId}/moderate`);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deletePhoto(photoId: string, eventId: string) {
  await requireAdmin();
  const supabase = createAdminClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("original_path, thumb_path, medium_path, display_path")
    .eq("id", photoId)
    .maybeSingle();

  if (photo) {
    await supabase.storage
      .from(PHOTOS_BUCKET)
      .remove([
        photo.original_path,
        photo.thumb_path,
        photo.medium_path,
        photo.display_path,
      ]);
  }
  await supabase.from("photos").delete().eq("id", photoId);
  revalidatePath(`/admin/events/${eventId}/moderate`);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function bulkSetStatus(
  photoIds: string[],
  status: PhotoStatus,
  eventId: string,
) {
  await requireAdmin();
  if (!photoIds.length) return;
  const supabase = createAdminClient();
  await supabase.from("photos").update({ status }).in("id", photoIds);
  revalidatePath(`/admin/events/${eventId}/moderate`);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function bulkDelete(photoIds: string[], eventId: string) {
  await requireAdmin();
  if (!photoIds.length) return;
  const supabase = createAdminClient();

  const { data: photos } = await supabase
    .from("photos")
    .select("original_path, thumb_path, medium_path, display_path")
    .in("id", photoIds);

  const paths = (photos ?? []).flatMap((p) => [
    p.original_path,
    p.thumb_path,
    p.medium_path,
    p.display_path,
  ]);
  if (paths.length) {
    await supabase.storage.from(PHOTOS_BUCKET).remove(paths);
  }
  await supabase.from("photos").delete().in("id", photoIds);
  revalidatePath(`/admin/events/${eventId}/moderate`);
  revalidatePath(`/admin/events/${eventId}`);
}
