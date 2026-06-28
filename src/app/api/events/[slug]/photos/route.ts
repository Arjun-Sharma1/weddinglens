import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestPhoto } from "@/lib/photo-ingest";
import { guestUploadWindow } from "@/lib/event-window";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const supabase = createAdminClient();

  // 1. Resolve the event.
  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, moderation, slug, event_date")
    .eq("slug", slug)
    .maybeSingle<Pick<EventRow, "id" | "moderation" | "slug" | "event_date">>();

  if (eventErr) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

  // 2. Guest upload window — guests may only post from 24h before the event
  //    starts until 48h after. Admins (the seed route) bypass this entirely.
  const window = guestUploadWindow(event.event_date, new Date());
  if (window !== "open") {
    const error =
      window === "too-early"
        ? "Photo uploads for this event haven't opened yet."
        : "This event has ended and is no longer accepting photos.";
    return NextResponse.json({ error }, { status: 403 });
  }

  // 3. Read the uploaded file.
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

  // 4. Ingest — guests are held to the live-photo freshness gate and the NSFW
  //    screen, and the resulting status follows the event's moderation mode.
  const result = await ingestPhoto(file, event, {
    enforceFreshness: true,
    enforceNsfw: true,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.stale ? { stale: true } : {}) },
      { status: result.httpStatus },
    );
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    status: result.status,
    duplicate: result.duplicate,
    pending: result.status === "pending",
  });
}
