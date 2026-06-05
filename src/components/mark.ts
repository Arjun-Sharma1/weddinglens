/**
 * WeddingLens brand mark — a camera lens ring whose aperture resolves into a
 * heart. Geometry lives here once so the on-screen <Mark /> (Brand.tsx) and the
 * generated favicon / app-icon / OG routes draw an identical glyph.
 *
 * viewBox is 0 0 48 48.
 */

export const MARK_VIEWBOX = 48;

/** Centered heart that nestles inside the lens ring. */
export const HEART_PATH =
  "M24 31.6 C21.5 29 16.5 25.5 16.5 21 C16.5 18.3 18.6 16.5 21 16.5 " +
  "C22.6 16.5 23.6 17.4 24 18.4 C24.4 17.4 25.4 16.5 27 16.5 " +
  "C29.4 16.5 31.5 18.3 31.5 21 C31.5 25.5 26.5 29 24 31.6 Z";

/** Champagne-gold stops shared with the CSS `.foil` utility. */
const GOLD_DEEP = "#a07f3c";
const GOLD = "#c2a15b";
const GOLD_LIGHT = "#e7d4a3";

type MarkColors = {
  /** Lens ring stroke color. */
  ring?: string;
  /** Heart fill — pass a solid color or "foil" for the gold gradient. */
  heart?: string | "foil";
  /** Optional rounded background tile (for favicons / app icons). */
  bg?: string;
  /** Rendered pixel size. Defaults to the viewBox (48). */
  size?: number;
};

/**
 * Returns a self-contained SVG string (no external refs) suitable for embedding
 * as a `data:` URI inside `next/og` ImageResponse, where satori renders an
 * <img>. Keep it dependency-free and inline.
 */
export function markSvg({
  ring = GOLD,
  heart = "foil",
  bg,
  size = MARK_VIEWBOX,
}: MarkColors = {}): string {
  const heartFill = heart === "foil" ? "url(#wlFoil)" : heart;
  const gradient =
    heart === "foil"
      ? `<linearGradient id="wlFoil" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
           <stop offset="0" stop-color="${GOLD_DEEP}"/>
           <stop offset="0.45" stop-color="${GOLD_LIGHT}"/>
           <stop offset="0.7" stop-color="${GOLD}"/>
           <stop offset="1" stop-color="${GOLD_DEEP}"/>
         </linearGradient>`
      : "";
  const tile = bg
    ? `<rect x="0" y="0" width="48" height="48" rx="11" fill="${bg}"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 48 48" fill="none">
  <defs>${gradient}</defs>
  ${tile}
  <circle cx="24" cy="24" r="21" fill="none" stroke="${ring}" stroke-width="2"/>
  <circle cx="24" cy="24" r="16.5" fill="none" stroke="${ring}" stroke-width="1" opacity="0.5"/>
  <path d="${HEART_PATH}" fill="${heartFill}"/>
</svg>`;
}

/** A `data:image/svg+xml` URI of the mark — ready for `<img src>`. */
export function markDataUri(colors: MarkColors = {}): string {
  return `data:image/svg+xml,${encodeURIComponent(markSvg(colors))}`;
}
