import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { processImage, sha256 } from "@/lib/images";
import { screenForNsfw, type NsfwResult } from "@/lib/moderation";
import { extractCapturedAt, isStalePhoto } from "@/lib/exif";
import { PHOTOS_BUCKET } from "@/lib/storage";
import type { EventRow, PhotoStatus } from "@/lib/types";

// Absolute upload ceiling — guards server memory against abusive uploads. Files
// under this but still large aren't rejected: processImage downscales them to a
// reasonable size (see fitSource in images.ts).
const MAX_BYTES = 60 * 1024 * 1024; // 60 MB
const STALE_MESSAGE = "Please take a new photo instead of uploading an old one.";

/** Minimal event shape the pipeline needs. */
type IngestEvent = Pick<EventRow, "id" | "moderation">;

export interface IngestOptions {
  /** Enforce the live-photo EXIF freshness gate (guest captures: true). */
  enforceFreshness: boolean;
  /**
   * Run the AWS Rekognition NSFW screen (guest uploads: true). Explicit photos
   * are silently stored as `rejected`. Fails open if Rekognition is
   * unavailable. Seed uploads (trusted moderator) skip it.
   */
  enforceNsfw: boolean;
  /**
   * Force the inserted row's status. When omitted the status follows the
   * event's moderation mode (manual → pending, auto → approved). An explicit
   * NSFW hit overrides this and forces `rejected`.
   */
  forceStatus?: PhotoStatus;
}

export type IngestResult =
  | { ok: true; id: string; status: PhotoStatus; duplicate: boolean }
  | { ok: false; httpStatus: number; error: string; stale?: boolean };

/**
 * Shared photo-ingestion pipeline used by both the guest upload route and the
 * moderator seed route: validate → dedup → (optional) freshness gate →
 * process renditions → upload to Storage → insert row.
 *
 * The only behavioral knobs are `enforceFreshness` (skip the EXIF live-photo
 * gate) and `forceStatus` (override the moderation-derived status). The EXIF
 * capture time is always extracted for metadata; only the rejection is gated.
 */
export async function ingestPhoto(
  file: File,
  event: IngestEvent,
  opts: IngestOptions,
): Promise<IngestResult> {
  const supabase = createAdminClient();

  // 1. Validate the file.
  if (file.size > MAX_BYTES) {
    return { ok: false, httpStatus: 413, error: "Photo is too large (over 60 MB)." };
  }
  if (file.type && !file.type.startsWith("image/")) {
    return { ok: false, httpStatus: 415, error: "File must be an image." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 2. Duplicate detection (exact bytes) — idempotent success.
  const hash = sha256(buffer);
  const { data: existing } = await supabase
    .from("photos")
    .select("id, status")
    .eq("event_id", event.id)
    .eq("hash", hash)
    .maybeSingle<{ id: string; status: PhotoStatus }>();

  if (existing) {
    return { ok: true, id: existing.id, status: existing.status, duplicate: true };
  }

  // 3. EXIF capture time (always extracted; gate is optional).
  const capturedAt = await extractCapturedAt(buffer);
  if (opts.enforceFreshness) {
    const maxAge = Number(process.env.PHOTO_MAX_AGE_MINUTES ?? "5");
    if (isStalePhoto(capturedAt, new Date(), maxAge)) {
      return { ok: false, httpStatus: 422, error: STALE_MESSAGE, stale: true };
    }
  }

  // 4. Process renditions + quality scoring.
  let processed;
  try {
    processed = await processImage(buffer);
  } catch {
    return { ok: false, httpStatus: 422, error: "Could not process that image." };
  }

  // 4b. NSFW screen (guest uploads only). Explicit photos are stored as
  //     `rejected` so they never reach a display surface; fails open.
  let nsfw: NsfwResult = { ran: false, isExplicit: false, score: null };
  if (opts.enforceNsfw) {
    nsfw = await screenForNsfw(buffer);
  }

  // 5. Upload renditions to Storage.
  const photoId = crypto.randomUUID();
  const prefix = `events/${event.id}/${photoId}`;
  const paths: Record<string, string> = {};

  for (const r of processed.renditions) {
    const path = `${prefix}/${r.key}.${r.ext}`;
    const { error: upErr } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .upload(path, r.buffer, { contentType: r.contentType, upsert: true });
    if (upErr) {
      await supabase.storage.from(PHOTOS_BUCKET).remove(Object.values(paths));
      return { ok: false, httpStatus: 502, error: "Upload failed." };
    }
    paths[r.key] = path;
  }

  // 6. Insert the photo row. An explicit NSFW hit forces `rejected`,
  //    overriding the moderation-derived status.
  const status: PhotoStatus = nsfw.isExplicit
    ? "rejected"
    : opts.forceStatus ?? (event.moderation === "manual" ? "pending" : "approved");
  const { data: inserted, error: insErr } = await supabase
    .from("photos")
    .insert({
      id: photoId,
      event_id: event.id,
      status,
      original_path: paths.original,
      thumb_path: paths.thumb,
      medium_path: paths.medium,
      display_path: paths.display,
      width: processed.width,
      height: processed.height,
      hash,
      captured_at: capturedAt?.toISOString() ?? null,
      brightness: processed.brightness,
      sharpness: processed.sharpness,
      quality_score: processed.qualityScore,
      is_blurry: processed.isBlurry,
      is_dark: processed.isDark,
      nsfw_score: nsfw.score,
      is_explicit: nsfw.isExplicit,
    })
    .select("id")
    .single();

  if (insErr) {
    // Unique (event_id, hash) race → another request won; treat as duplicate.
    await supabase.storage.from(PHOTOS_BUCKET).remove(Object.values(paths));
    if (insErr.code === "23505") {
      return { ok: true, id: photoId, status, duplicate: true };
    }
    return { ok: false, httpStatus: 500, error: "Could not save photo." };
  }

  return { ok: true, id: inserted.id, status, duplicate: false };
}
