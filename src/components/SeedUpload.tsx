"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Summary = { added: number; duplicate: number; failed: number };

type Phase =
  | { kind: "idle" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "done"; summary: Summary; errors: string[] };

export function SeedUpload({ eventId }: { eventId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  const onFiles = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = ""; // allow re-picking the same files later
      if (files.length === 0) return;

      const summary: Summary = { added: 0, duplicate: 0, failed: 0 };
      const errors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        setPhase({ kind: "uploading", done: i, total: files.length });
        const file = files[i];
        const form = new FormData();
        form.append("photo", file, file.name);
        try {
          const res = await fetch(`/api/admin/events/${eventId}/photos`, {
            method: "POST",
            body: form,
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            summary.failed++;
            errors.push(`${file.name}: ${data?.error ?? "Upload failed."}`);
          } else if (data?.duplicate) {
            summary.duplicate++;
          } else {
            summary.added++;
          }
        } catch {
          summary.failed++;
          errors.push(`${file.name}: Network error.`);
        }
      }

      setPhase({ kind: "done", summary, errors });
      router.refresh(); // repopulate the moderation grid
    },
    [eventId, router],
  );

  const busy = phase.kind === "uploading";

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="btn btn-primary px-5 py-2.5 text-sm disabled:opacity-60"
      >
        {busy
          ? `Uploading ${phase.done + 1} of ${phase.total}…`
          : "Upload photos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={onFiles}
      />

      {phase.kind === "idle" && (
        <p className="text-xs text-ink-faint">
          Seed the slideshow with your own photos. These appear instantly —
          they skip review and the live-photo check.
        </p>
      )}

      {phase.kind === "done" && (
        <Result summary={phase.summary} errors={phase.errors} />
      )}
    </div>
  );
}

function Result({ summary, errors }: { summary: Summary; errors: string[] }) {
  const parts: string[] = [];
  if (summary.added) parts.push(`${summary.added} added`);
  if (summary.duplicate)
    parts.push(`${summary.duplicate} already there`);
  if (summary.failed) parts.push(`${summary.failed} failed`);

  return (
    <div className="text-xs">
      <p className={summary.failed ? "text-amber-700" : "text-emerald-700"}>
        {parts.length ? parts.join(" · ") : "Nothing to upload."}
      </p>
      {errors.length > 0 && (
        <ul className="mt-1 space-y-0.5 text-ink-faint">
          {errors.slice(0, 5).map((err, i) => (
            <li key={i}>{err}</li>
          ))}
          {errors.length > 5 && <li>…and {errors.length - 5} more.</li>}
        </ul>
      )}
    </div>
  );
}
