import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, getEventPhotosAll } from "@/lib/events";
import { ModerationGrid } from "@/components/ModerationGrid";
import { SeedUpload } from "@/components/SeedUpload";

export const dynamic = "force-dynamic";

export default async function ModeratePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const photos = await getEventPhotosAll(event.id);

  return (
    <div>
      <Link
        href={`/admin/events/${event.id}`}
        className="text-sm text-ink-faint hover:text-ink"
      >
        ← {event.name}
      </Link>
      <h1 className="font-display mt-4 text-3xl text-ink sm:text-4xl">
        Moderate photos
      </h1>
      <p className="mt-2 text-ink-soft">
        {event.moderation === "manual"
          ? "Manual review is on — only approved photos appear publicly."
          : "Auto-approve is on — photos appear instantly. You can still reject or remove any here."}
      </p>

      <div className="mt-6 rounded-2xl border border-line bg-surface px-5 py-4 shadow-e1">
        <SeedUpload eventId={event.id} />
      </div>

      <ModerationGrid eventId={event.id} photos={photos} />
    </div>
  );
}
