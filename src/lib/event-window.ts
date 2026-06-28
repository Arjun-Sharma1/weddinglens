/**
 * Guest upload window: photos may only be posted by guests from 24 hours before
 * the event starts until 48 hours after it starts. This curbs abuse — strangers
 * dumping unrelated photos long after (or before) the event. Admins (the
 * moderator seed route) are not subject to this window.
 *
 * Pure and side-effect free, like `isStalePhoto` in exif.ts, so it can be
 * reasoned about and tested in isolation.
 */

const HOUR_MS = 60 * 60 * 1000;
const OPENS_BEFORE_MS = 24 * HOUR_MS;
const CLOSES_AFTER_MS = 48 * HOUR_MS;

export type UploadWindowState = "open" | "too-early" | "too-late";

/**
 * Determine whether guest uploads are open for an event at `now`.
 *
 * The anchor is midnight UTC of `event_date` (a bare date with no time). The app
 * has no timezone handling, so UTC keeps this consistent with the rest of the
 * codebase; the 24h/48h padding makes the exact boundary forgiving anyway.
 *
 * Events with no `event_date` are unrestricted (returns "open").
 */
export function guestUploadWindow(
  eventDate: string | null,
  now: Date,
): UploadWindowState {
  if (!eventDate) return "open";

  const start = new Date(`${eventDate}T00:00:00Z`).getTime();
  if (Number.isNaN(start)) return "open"; // unparseable date → don't block

  const t = now.getTime();
  if (t < start - OPENS_BEFORE_MS) return "too-early";
  if (t > start + CLOSES_AFTER_MS) return "too-late";
  return "open";
}
