import Link from "next/link";
import { createEvent } from "@/app/admin/actions";
import { EventForm } from "@/components/EventForm";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/admin" className="text-sm text-ink-faint hover:text-ink">
        ← Events
      </Link>
      <h1 className="font-display mt-4 text-3xl text-ink sm:text-4xl">New event</h1>
      <p className="mt-2 text-ink-soft">
        Give your celebration a name and a link. You can fine-tune everything
        later.
      </p>
      <div className="card mt-8 p-6 sm:p-8">
        <EventForm action={createEvent} submitLabel="Create event" />
      </div>
    </div>
  );
}
