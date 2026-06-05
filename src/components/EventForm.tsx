"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { FormState } from "@/app/admin/actions";
import type { EventRow } from "@/lib/types";

type Action = (state: FormState, formData: FormData) => Promise<FormState>;

export function EventForm({
  action,
  event,
  submitLabel,
}: {
  action: Action;
  event?: EventRow;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    {},
  );

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <Field label="Event name" hint="e.g. Arjun & Priya">
        <input
          name="name"
          defaultValue={event?.name ?? ""}
          required
          className="input"
          placeholder="Arjun & Priya"
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Link (slug)" hint="Leave blank to auto-generate">
          <div className="flex items-center rounded-xl border border-line bg-paper px-3">
            <span className="text-sm text-ink-faint">/event/</span>
            <input
              name="slug"
              defaultValue={event?.slug ?? ""}
              className="w-full bg-transparent px-1 py-3 text-ink outline-none"
              placeholder="arjun-and-priya"
            />
          </div>
        </Field>

        <Field label="Event date">
          <input
            type="date"
            name="event_date"
            defaultValue={event?.event_date ?? ""}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Display mode">
          <select name="mode" defaultValue={event?.mode ?? "slideshow"} className="input">
            <option value="slideshow">Slideshow</option>
            <option value="wall">Photo wall</option>
          </select>
        </Field>

        <Field label="Moderation">
          <select
            name="moderation"
            defaultValue={event?.moderation ?? "auto"}
            className="input"
          >
            <option value="auto">Auto-approve (instant)</option>
            <option value="manual">Manual review</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Seconds per photo" hint="Slideshow only">
          <input
            type="number"
            name="slide_seconds"
            min={2}
            max={60}
            defaultValue={event?.slide_seconds ?? 8}
            className="input"
          />
        </Field>

        <Field label="QR screen every N photos">
          <input
            type="number"
            name="qr_every"
            min={1}
            max={50}
            defaultValue={event?.qr_every ?? 5}
            className="input"
          />
        </Field>
      </div>

      {state.error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="focus-gold rounded-full bg-ink px-6 py-3 text-sm font-medium text-paper transition hover:bg-gold-deep disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        <Link
          href={event ? `/admin/events/${event.id}` : "/admin"}
          className="focus-gold rounded-full px-5 py-3 text-sm text-ink-soft transition hover:text-ink"
        >
          Cancel
        </Link>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--line);
          background: var(--paper);
          padding: 0.75rem 1rem;
          color: var(--ink);
          outline: none;
        }
        .input:focus-visible { box-shadow: 0 0 0 3px var(--ring); }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {hint && <span className="ml-2 text-xs text-ink-faint">{hint}</span>}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
