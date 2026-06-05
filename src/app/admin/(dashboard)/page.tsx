import type { CSSProperties } from "react";
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
        <Link href="/admin/events/new" className="btn btn-primary px-5 py-3 text-sm">
          + New event
        </Link>
      </div>

      <div className="rule-gold my-8" />

      {events.length === 0 ? (
        <div className="card vignette border-dashed py-20 text-center shadow-none">
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
            className="btn btn-primary mt-6 px-6 py-3 text-sm"
          >
            + New event
          </Link>
        </div>
      ) : (
        <ul className="stagger grid gap-5 sm:grid-cols-2">
          {events.map((event, i) => (
            <li key={event.id} style={{ "--i": i } as CSSProperties}>
              <Link
                href={`/admin/events/${event.id}`}
                className="focus-gold card lift group block p-6"
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow">/{event.slug}</span>
                  <span className="rounded-full border border-line bg-surface-sunk px-2.5 py-1 text-[0.65rem] uppercase tracking-wider text-ink-faint">
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
