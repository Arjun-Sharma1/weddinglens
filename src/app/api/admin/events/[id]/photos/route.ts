import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestPhoto } from "@/lib/photo-ingest";
import type { EventRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Moderator seed upload: add existing photos (from the moderator's device) to
 * an event so the slideshow / wall isn't empty. Unlike the guest route this
 * skips the live-photo freshness gate and always approves, regardless of the
 * event's moderation mode. One photo per request.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const supabase = createAdminClient();

  const { data: event, error: eventErr } = await supabase
    .from("events")
    .select("id, moderation")
    .eq("id", id)
    .maybeSingle<Pick<EventRow, "id" | "moderation">>();

  if (eventErr) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json({ error: "Event not found." }, { status: 404 });
  }

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

  const result = await ingestPhoto(file, event, {
    enforceFreshness: false,
    enforceNsfw: false,
    forceStatus: "approved",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.httpStatus });
  }

  return NextResponse.json({
    ok: true,
    id: result.id,
    status: result.status,
    duplicate: result.duplicate,
  });
}
