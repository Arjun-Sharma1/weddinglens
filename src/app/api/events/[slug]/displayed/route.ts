import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Best-effort increment of a photo's display_count, called by the slideshow
 * when a photo is shown. Powers the "photos displayed" admin stat.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  await ctx.params; // slug not needed; photo id is globally unique
  let id: string | undefined;
  try {
    ({ id } = await req.json());
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!id) return NextResponse.json({ ok: false }, { status: 400 });

  const supabase = createAdminClient();
  await supabase.rpc("increment_display_count", { photo_id: id });
  return NextResponse.json({ ok: true });
}
