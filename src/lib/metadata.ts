import type { Metadata } from "next";
import type { EventRow } from "@/lib/types";

const BRAND = "WeddingLens Live";

type Surface = "invite" | "capture" | "slideshow" | "wall";

const SURFACE: Record<
  Surface,
  { suffix?: string; line: (name: string) => string }
> = {
  invite: {
    line: (name) =>
      `You're invited to capture ${name}. Snap a photo from your phone and watch it appear, live, on the big screen.`,
  },
  capture: {
    suffix: "Capture",
    line: (name) =>
      `Add your photos to ${name} — take a picture from your phone and it appears on the big screen in seconds.`,
  },
  slideshow: {
    suffix: "Live Slideshow",
    line: (name) =>
      `Live photos from ${name}, appearing on the big screen in real time.`,
  },
  wall: {
    suffix: "Photo Wall",
    line: (name) => `Every guest's photos from ${name}, live on the wall.`,
  },
};

/**
 * Share-friendly metadata for a guest-facing event surface.
 *
 * Crucially overrides `openGraph`/`twitter` titles. Next merges metadata
 * **shallowly**, so a page that sets only `title` still inherits the root's
 * `openGraph.title` — meaning every shared link preview would otherwise read
 * "your live event photo wall" instead of the event's name.
 */
export function eventMetadata(
  event: EventRow | null,
  surface: Surface,
): Metadata {
  if (!event) return { title: BRAND };

  const { suffix, line } = SURFACE[surface];
  const heading = suffix ? `${event.name} — ${suffix}` : event.name;
  const title = `${heading} · ${BRAND}`;
  const description = line(event.name);

  return {
    title: { absolute: title },
    description,
    openGraph: {
      type: "website",
      siteName: BRAND,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}
