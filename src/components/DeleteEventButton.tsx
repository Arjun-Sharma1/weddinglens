"use client";

import { useState, useTransition } from "react";
import { deleteEvent } from "@/app/admin/actions";

export function DeleteEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="focus-gold rounded-full border border-red-200 px-4 py-2 text-sm text-red-700 transition hover:bg-red-50"
      >
        Delete event
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-ink-soft">Delete “{eventName}” and all photos?</span>
      <button
        disabled={pending}
        onClick={() => startTransition(() => deleteEvent(eventId))}
        className="focus-gold rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="focus-gold rounded-full px-3 py-2 text-sm text-ink-soft hover:text-ink"
      >
        Cancel
      </button>
    </div>
  );
}
