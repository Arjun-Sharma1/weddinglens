import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { processImage, sha256 } from "@/lib/images";
import { extractCapturedAt, isStalePhoto } from "@/lib/exif";
import { PHOTOS_BUCKET } from "@/lib/storage";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const STALE_MESSAGE =
  "Please take a new photo instead of uploading an old one.";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const supabase = createAdminClient();

  // 1. Resolve the event.
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, moderation, slug")
    .eq("slug", slug)
    .maybeSingle<Pick<EventRow, "id" | "moderation" | "slug">>();

  if (eventErr) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // 2. Read the uploaded file.
  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("photo");
    if (f instanceof File) file = f;
  } catch {
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }
  if (!file) {
    return NextResponse.json({ error: "No photo provided." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Photo is too large." }, { status: 413 });
  }
  if (file.type && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image." }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // 3. Duplicate detection (exact bytes) — idempotent success.
  const hash = sha256(buffer);
  const { data: existing } = await supabase
    .from("photos")
    .select("id, status")
    .eq("event_id", event.id)
    .eq("hash", hash)
    .maybeSingle<{ id: string; status: string }>();

  if (existing) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      id: existing.id,
      status: existing.status,
    });
  }

  // 4. Live-photo gate (EXIF capture time).
  const maxAge = Number(process.env.PHOTO_MAX_AGE_MINUTES ?? "5");
  const capturedAt = await extractCapturedAt(buffer);
  if (isStalePhoto(capturedAt, new Date(), maxAge)) {
    return NextResponse.json({ error: STALE_MESSAGE, stale: true }, { status: 422 });
  }

  // 5. Process renditions + quality scoring.
  let processed;
  try {
    processed = await processImage(buffer);
  } catch {
    return NextResponse.json(
      { error: "Could not process that image." },
      { status: 422 },
    );
  }

  // 6. Upload renditions to Storage.
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
      return NextResponse.json({ error: "Upload failed." }, { status: 502 });
    }
    paths[r.key] = path;
  }

  // 7. Insert the photo row (status follows the event's moderation mode).
  const status = event.moderation === "manual" ? "pending" : "approved";
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
    })
    .select("id")
    .single();

  if (insErr) {
    // Unique (event_id, hash) race → another request won; treat as duplicate.
    await supabase.storage.from(PHOTOS_BUCKET).remove(Object.values(paths));
    if (insErr.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "Could not save photo." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: inserted.id,
    status,
    pending: status === "pending",
  });
}
