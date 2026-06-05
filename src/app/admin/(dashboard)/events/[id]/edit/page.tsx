import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById } from "@/lib/events";
import { updateEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/EventForm";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const action = updateEvent.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={`/admin/events/${id}`}
        className="text-sm text-ink-faint hover:text-ink"
      >
        ← {event.name}
      </Link>
      <h1 className="font-display mt-4 text-4xl text-ink">Edit event</h1>
      <div className="card mt-8 p-6 sm:p-8">
        <EventForm action={action} event={event} submitLabel="Save changes" />
      </div>
    </div>
  );
}
