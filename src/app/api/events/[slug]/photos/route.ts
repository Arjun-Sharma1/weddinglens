import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestPhoto } from "@/lib/photo-ingest";
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

  // 3. Ingest — guests are held to the live-photo freshness gate and the NSFW
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
