export function Brand({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span
      className={`font-display tracking-tight ${className}`}
      style={{ fontWeight: 600 }}
    >
      <span className={onDark ? "text-paper" : "text-ink"}>Wedding</span>
      <span className="foil">Lens</span>
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
