// Domain types mirroring the Supabase schema (see supabase/schema.sql).

export type EventMode = "slideshow" | "wall";
export type ModerationMode = "auto" | "manual";
export type PhotoStatus = "pending" | "approved" | "rejected";

export interface EventRow {
  id: string;
  slug: string;
  name: string;
  event_date: string | null;
  cover_image_path: string | null;
  mode: EventMode;
  moderation: ModerationMode;
  slide_seconds: number;
  qr_every: number;
  created_at: string;
}

export interface PhotoRow {
  id: string;
  event_id: string;
  status: PhotoStatus;
  original_path: string;
  thumb_path: string;
  medium_path: string;
  display_path: string;
  width: number | null;
  height: number | null;
  hash: string;
  captured_at: string | null;
  brightness: number | null;
  sharpness: number | null;
  quality_score: number | null;
  is_blurry: boolean;
  is_dark: boolean;
  display_count: number;
  created_at: string;
}

export interface EventStats {
  totalUploads: number;
  uploadsToday: number;
  activeGuests: number;
  photosDisplayed: number;
  pending: number;
  approved: number;
  rejected: number;
}
