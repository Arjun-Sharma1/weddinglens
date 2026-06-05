export const PHOTOS_BUCKET = "photos";

/**
 * Build a public CDN URL for an object in the `photos` bucket from its
 * storage path (e.g. "events/<id>/<photoId>/display.webp").
 */
export function publicPhotoUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL.");
  return `${base}/storage/v1/object/public/${PHOTOS_BUCKET}/${path}`;
}
