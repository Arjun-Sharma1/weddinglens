import "server-only";
import exifr from "exifr";

/**
 * Extract the EXIF capture timestamp (DateTimeOriginal / CreateDate).
 * Returns null when no timestamp is present (e.g. canvas-captured frames,
 * which is fine — the live-camera flow is the primary path).
 */
export async function extractCapturedAt(buffer: Buffer): Promise<Date | null> {
  try {
    const data = await exifr.parse(buffer, {
      pick: ["DateTimeOriginal", "CreateDate", "ModifyDate"],
    });
    const when: Date | undefined =
      data?.DateTimeOriginal ?? data?.CreateDate ?? data?.ModifyDate;
    if (when instanceof Date && !Number.isNaN(when.getTime())) return when;
    return null;
  } catch {
    return null;
  }
}

/**
 * Live-photo gate. Returns true when the photo is too old to accept.
 * Photos without an EXIF timestamp pass (we can't prove they're stale and the
 * camera-capture path legitimately has none). `maxAgeMinutes <= 0` disables.
 */
export function isStalePhoto(
  capturedAt: Date | null,
  now: Date,
  maxAgeMinutes: number,
): boolean {
  if (!capturedAt || maxAgeMinutes <= 0) return false;
  const ageMs = now.getTime() - capturedAt.getTime();
  // Guard against clock skew producing a "future" capture time.
  if (ageMs < 0) return false;
  return ageMs > maxAgeMinutes * 60_000;
}
