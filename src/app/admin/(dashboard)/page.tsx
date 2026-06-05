import Link from "next/link";
import { getAllEvents } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { Ornament } from "@/components/Brand";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const events = await getAllEvents();

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Your celebrations</p>
          <h1 className="font-display mt-2 text-4xl text-ink">Events</h1>
        </div>
        <Link
          href="/admin/events/new"
          className="focus-gold rounded-full bg-ink px-5 py-3 text-sm font-medium text-paper transition hover:bg-gold-deep"
        >
          + New event
        </Link>
      </div>

      <div className="rule-gold my-8" />

      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-20 text-center">
          <div className="flex items-center justify-center gap-3">
            <Ornament />
            <span className="eyebrow">Nothing here yet</span>
            <Ornament />
          </div>
          <p className="font-display mt-4 text-2xl text-ink">
            Create your first event
          </p>
          <p className="mx-auto mt-2 max-w-sm text-ink-soft">
            Set up a wedding, share the QR code, and watch the photos roll in.
          </p>
          <Link
            href="/admin/events/new"
            className="focus-gold mt-6 inline-block rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper hover:bg-gold-deep"
          >
            + New event
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="focus-gold group block rounded-2xl border border-line bg-paper-deep/30 p-6 transition hover:border-gold hover:shadow-[0_20px_50px_-30px_rgba(120,90,30,0.4)]"
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow">/{event.slug}</span>
                  <span className="rounded-full border border-line px-2.5 py-1 text-[0.65rem] uppercase tracking-wider text-ink-faint">
                    {event.mode} · {event.moderation}
                  </span>
                </div>
                <h2 className="font-display mt-3 text-2xl text-ink transition group-hover:text-gold-deep">
                  {event.name}
                </h2>
                <p className="mt-1 text-sm text-ink-faint">
                  {formatEventDate(event.event_date) || "No date set"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
