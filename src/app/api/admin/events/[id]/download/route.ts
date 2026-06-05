import { type NextRequest } from "next/server";
import { PassThrough, Readable } from "node:stream";
import * as ArchiverNS from "archiver";
import { auth } from "@/auth";

// archiver@8 exposes a `ZipArchive` class. @types/archiver (v7) predates it,
// so resolve it through a typed namespace cast (matches the real runtime shape).
const { ZipArchive } = ArchiverNS as unknown as {
  ZipArchive: new (opts?: { zlib?: { level?: number } }) => {
    pipe(dest: NodeJS.WritableStream): unknown;
    append(source: Buffer | string, opts: { name: string }): unknown;
    finalize(): Promise<void>;
    abort(): unknown;
  };
};
import { createAdminClient } from "@/lib/supabase/admin";
import { PHOTOS_BUCKET } from "@/lib/storage";
import type { EventRow, PhotoRow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await ctx.params;
  const supabase = createAdminClient();

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle<EventRow>();
  if (!event) return new Response("Not found", { status: 404 });

  const { data: photos } = await supabase
    .from("photos")
    .select("*")
    .eq("event_id", id)
    .neq("status", "rejected")
    .order("created_at", { ascending: true });

  const rows = (photos ?? []) as PhotoRow[];

  const archive = new ZipArchive({ zlib: { level: 6 } });
  const pass = new PassThrough();
  archive.pipe(pass);

  // Stream originals + CSV concurrently with the response being read.
  (async () => {
    try {
      const header = [
        "index",
        "id",
        "filename",
        "created_at",
        "captured_at",
        "status",
        "width",
        "height",
        "quality_score",
        "is_blurry",
        "is_dark",
      ].join(",");
      const lines: string[] = [header];

      let i = 0;
      for (const p of rows) {
        i++;
        const filename = `photos/${String(i).padStart(4, "0")}-${p.id}.jpg`;
        const { data: blob } = await supabase.storage
          .from(PHOTOS_BUCKET)
          .download(p.original_path);
        if (blob) {
          const buf = Buffer.from(await blob.arrayBuffer());
          archive.append(buf, { name: filename });
        }
        lines.push(
          [
            i,
            p.id,
            filename,
            p.created_at,
            p.captured_at ?? "",
            p.status,
            p.width ?? "",
            p.height ?? "",
            p.quality_score ?? "",
            p.is_blurry,
            p.is_dark,
          ]
            .map(csvCell)
            .join(","),
        );
      }

      archive.append(lines.join("\n"), { name: `${event.slug}-report.csv` });
      await archive.finalize();
    } catch (err) {
      archive.abort();
      pass.destroy(err as Error);
    }
  })();

  const webStream = Readable.toWeb(pass) as unknown as ReadableStream<Uint8Array>;
  return new Response(webStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${event.slug}-weddinglens.zip"`,
      "Cache-Control": "no-store",
    },
  });
}
