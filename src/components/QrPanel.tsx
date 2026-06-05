/**
 * QR invitation card used on the slideshow QR screen, the wall, and empty
 * states. `markup` is server-generated inline SVG (dark modules, transparent).
 */
export function QrPanel({
  markup,
  eventName,
  uploadHref,
  headline,
}: {
  markup: string;
  eventName: string;
  uploadHref: string;
  headline: string;
}) {
  const pretty = uploadHref.replace(/^https?:\/\//, "");
  return (
    <div className="flex flex-col items-center text-center">
      <p className="eyebrow text-gold-light">{eventName}</p>

      <h2 className="font-display mt-5 max-w-2xl text-balance text-5xl leading-[1.08] md:text-6xl">
        {headline}
      </h2>

      <div className="mt-10 rounded-[2rem] bg-paper p-7 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8),0_0_60px_-12px_rgba(194,161,91,0.45)] ring-1 ring-gold/40">
        <div
          className="h-56 w-56 md:h-64 md:w-64 [&_svg]:h-full [&_svg]:w-full"
          // QR SVG generated on the server from the upload URL.
          dangerouslySetInnerHTML={{ __html: markup }}
        />
      </div>

      <p className="mt-7 text-sm uppercase tracking-[0.18em] text-paper/55">
        Scan with your phone camera
      </p>
      <p className="mt-1 font-display text-lg text-gold">{pretty}</p>
    </div>
  );
}
