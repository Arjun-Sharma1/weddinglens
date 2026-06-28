import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventStats } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { uploadUrl, qrPngDataUrl } from "@/lib/qr";
import { CopyButton } from "@/components/CopyButton";
import { DeleteEventButton } from "@/components/DeleteEventButton";

export const dynamic = "force-dynamic";

export default async function EventDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const [stats, qrPng] = await Promise.all([
    getEventStats(event.id),
    qrPngDataUrl(uploadUrl(event.slug)),
  ]);

  const guestUrl = uploadUrl(event.slug);
  const base = guestUrl.replace(/\/event\/.*$/, "");

  const stat = [
    { label: "Total uploads", value: stats.totalUploads },
    { label: "Uploads today", value: stats.uploadsToday },
    { label: "Active guests", value: stats.activeGuests, hint: "last 15 min" },
    { label: "Photos displayed", value: stats.photosDisplayed },
  ];

  return (
    <div>
      <Link href="/admin" className="text-sm text-ink-faint hover:text-ink">
        ← Events
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">/{event.slug}</span>
          <h1 className="font-display mt-1 text-3xl text-ink sm:text-4xl">
            {event.name}
          </h1>
          <p className="mt-1 text-ink-faint">
            {formatEventDate(event.event_date) || "No date set"} · {event.mode} ·{" "}
            {event.moderation === "manual" ? "manual review" : "auto-approve"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/admin/events/${event.id}/edit`}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            Edit
          </Link>
          <DeleteEventButton eventId={event.id} eventName={event.name} />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stat.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="font-display text-3xl text-ink [font-variant-numeric:tabular-nums]">
              {s.value}
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-ink-faint">
              {s.label}
            </div>
            {s.hint && <div className="text-[0.65rem] text-ink-faint">{s.hint}</div>}
          </div>
        ))}
      </div>

      {/* Moderation summary */}
      {event.moderation === "manual" && (
        <Link
          href={`/admin/events/${event.id}/moderate`}
          className="focus-gold lift mt-4 flex items-center justify-between rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4 shadow-e1 transition hover:bg-gold/15"
        >
          <span className="text-ink">
            <strong className="font-display text-xl">{stats.pending}</strong> photo
            {stats.pending === 1 ? "" : "s"} awaiting review
          </span>
          <span className="text-sm font-medium text-gold-deep">Review →</span>
        </Link>
      )}

      <div className="rule-gold my-9" />

      <div className="grid gap-6 md:grid-cols-[auto_minmax(0,1fr)] md:gap-8">
        {/* QR */}
        <div className="text-center">
          <div className="inline-block rounded-2xl border border-line bg-white p-4 shadow-e3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrPng} alt="Event QR code" className="h-44 w-44" />
          </div>
          <div className="mt-3">
            <a
              href={qrPng}
              download={`${event.slug}-qr.png`}
              className="focus-gold text-sm font-medium text-gold-deep hover:underline"
            >
              Download QR
            </a>
          </div>
        </div>

        {/* Links */}
        <div className="min-w-0 space-y-3">
          <LinkRow label="Guest upload" url={guestUrl} />
          <LinkRow label="Slideshow" url={`${base}/event/${event.slug}/slideshow`} openable />
          <LinkRow label="Photo wall" url={`${base}/event/${event.slug}/wall`} openable />

          <div className="flex flex-col gap-2 pt-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/admin/events/${event.id}/moderate`}
              className="btn btn-primary w-full px-5 py-2.5 text-sm sm:w-auto"
            >
              Moderate photos
            </Link>
            <a
              href={`/api/admin/events/${event.id}/download`}
              className="btn btn-ghost w-full px-5 py-2.5 text-sm sm:w-auto"
            >
              Download package (ZIP + CSV)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  url,
  openable,
}: {
  label: string;
  url: string;
  openable?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-e1">
      <div className="min-w-0 flex-1">
        <div className="text-xs uppercase tracking-wider text-ink-faint">{label}</div>
        <div className="truncate text-sm text-ink">{url.replace(/^https?:\/\//, "")}</div>
      </div>
      {openable && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="btn btn-ghost px-3 py-1.5 text-xs"
        >
          Open
        </a>
      )}
      <CopyButton value={url} />
    </div>
  );
}
