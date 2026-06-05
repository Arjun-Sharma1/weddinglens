import { HEART_PATH } from "./mark";

/**
 * The WeddingLens lens-and-heart mark, rendered as inline SVG with a live foil
 * gradient. Crisp at any size and theme-aware. Geometry is shared with the
 * generated icons via `./mark`.
 */
export function Mark({
  size = 28,
  className = "",
  onDark = false,
}: {
  size?: number;
  className?: string;
  onDark?: boolean;
}) {
  const ring = onDark ? "#e7d4a3" : "#c2a15b";
  // Unique gradient id per render size keeps multiple marks on a page valid.
  const id = `wl-foil-${size}-${onDark ? "d" : "l"}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a07f3c" />
          <stop offset="0.45" stopColor="#e7d4a3" />
          <stop offset="0.7" stopColor="#c2a15b" />
          <stop offset="1" stopColor="#a07f3c" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="21" fill="none" stroke={ring} strokeWidth="2" />
      <circle cx="24" cy="24" r="16.5" fill="none" stroke={ring} strokeWidth="1" opacity="0.5" />
      <path d={HEART_PATH} fill={`url(#${id})`} />
    </svg>
  );
}

export function Brand({
  className = "",
  onDark = false,
  withMark = false,
  markSize,
}: {
  className?: string;
  onDark?: boolean;
  /** Show the lens-and-heart mark beside the wordmark. */
  withMark?: boolean;
  markSize?: number;
}) {
  const wordmark = (
    <span
      className={`font-display tracking-tight ${withMark ? "" : className}`}
      style={{ fontWeight: 600 }}
    >
      <span className={onDark ? "text-paper" : "text-ink"}>Wedding</span>
      <span className="foil">Lens</span>
    </span>
  );

  if (!withMark) return wordmark;

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Mark size={markSize ?? 30} onDark={onDark} />
      {wordmark}
    </span>
  );
}

/** Small decorative gold diamond ornament. */
export function Ornament({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 rotate-45 bg-gold ${className}`}
    />
  );
}
