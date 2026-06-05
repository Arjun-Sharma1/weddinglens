import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getEventBySlug } from "@/lib/events";
import { formatEventDate } from "@/lib/format";
import { publicPhotoUrl } from "@/lib/storage";
import { Brand, Ornament } from "@/components/Brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? `${event.name} · WeddingLens Live` : "WeddingLens Live" };
}

export default async function EventLanding({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const dateLabel = formatEventDate(event.event_date);

  return (
    <main className="grain vignette relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="animate-rise w-full max-w-md text-center">
        <Brand withMark markSize={28} className="text-xl" />

        {event.cover_image_path && (
          // Plain img: cover lives on the Supabase CDN.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={publicPhotoUrl(event.cover_image_path)}
            alt=""
            className="mx-auto mt-8 h-44 w-44 rounded-full object-cover ring-1 ring-gold/40 shadow-[0_18px_40px_-18px_rgba(120,90,30,0.45)]"
          />
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <span className="rule-gold w-10" />
          <span className="eyebrow">You’re invited to capture</span>
          <span className="rule-gold w-10" />
        </div>

        <h1 className="font-display mt-4 text-balance text-5xl leading-[1.05] text-ink">
          {event.name}
        </h1>

        {dateLabel && (
          <p className="mt-4 text-sm uppercase tracking-[0.2em] text-ink-faint">
            {dateLabel}
          </p>
        )}

        <p className="mx-auto mt-7 max-w-xs text-ink-soft">
          Take a photo from your phone and watch it appear, live, on the big
          screen.
        </p>

        <Link
          href={`/event/${slug}/upload`}
          className="btn btn-primary group mt-9 w-full px-8 py-4 text-base"
        >
          <CameraGlyph />
          Open the camera
        </Link>

        <div className="mt-10 flex items-center justify-center gap-2 text-ink-faint">
          <Ornament />
          <span className="text-xs tracking-wide">No app, no sign-up</span>
          <Ornament />
        </div>
      </div>
    </main>
  );
}

function CameraGlyph() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition group-hover:scale-110"
      aria-hidden
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7H7l1.2-1.8A1 1 0 0 1 9 4.7h6a1 1 0 0 1 .8.5L17 7h2.5A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </svg>
  );
}
