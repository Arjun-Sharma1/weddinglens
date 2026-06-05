"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  setPhotoStatus,
  deletePhoto,
  bulkSetStatus,
  bulkDelete,
} from "@/app/admin/actions";
import { publicPhotoUrl } from "@/lib/storage";
import type { PhotoRow, PhotoStatus } from "@/lib/types";

type Filter = "all" | PhotoStatus;

const FILTERS: { key: Filter; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export function ModerationGrid({
  eventId,
  photos,
}: {
  eventId: string;
  photos: PhotoRow[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>(
    photos.some((p) => p.status === "pending") ? "pending" : "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();

  const counts = useMemo(() => {
    const c = { all: photos.length, pending: 0, approved: 0, rejected: 0 };
    for (const p of photos) c[p.status]++;
    return c;
  }, [photos]);

  const visible = useMemo(
    () => (filter === "all" ? photos : photos.filter((p) => p.status === filter)),
    [photos, filter],
  );

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      setSelected(new Set());
      router.refresh();
    });

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedIds = [...selected];

  return (
    <div className="mt-6">
      {/* Filter tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`focus-gold rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === f.key
                ? "bg-ink text-paper"
                : "border border-line text-ink-soft hover:border-gold hover:text-gold-deep"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-20 z-10 mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-gold/40 bg-paper-deep/70 px-4 py-3 backdrop-blur">
          <span className="text-sm font-medium text-ink">
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              disabled={pending}
              onClick={() => run(() => bulkSetStatus(selectedIds, "approved", eventId))}
              className="focus-gold rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              disabled={pending}
              onClick={() => run(() => bulkSetStatus(selectedIds, "rejected", eventId))}
              className="focus-gold rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Reject
            </button>
            <button
              disabled={pending}
              onClick={() => run(() => bulkDelete(selectedIds, eventId))}
              className="focus-gold rounded-full bg-red-600 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              Delete
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="focus-gold rounded-full px-3 py-1.5 text-xs text-ink-soft hover:text-ink"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      {visible.length === 0 ? (
        <p className="mt-12 text-center text-ink-faint">No photos in this view.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visible.map((photo) => {
            const isSel = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                className={`group relative overflow-hidden rounded-xl border bg-paper-deep/20 transition ${
                  isSel ? "border-gold ring-2 ring-gold/40" : "border-line"
                }`}
              >
                <button
                  onClick={() => toggle(photo.id)}
                  className="block w-full"
                  aria-label="Select photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicPhotoUrl(photo.thumb_path)}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </button>

                {/* status + quality badges */}
                <div className="pointer-events-none absolute left-2 top-2 flex gap-1">
                  <StatusBadge status={photo.status} />
                  {photo.is_blurry && <Tag>blurry</Tag>}
                  {photo.is_dark && <Tag>dark</Tag>}
                </div>

                {isSel && (
                  <div className="pointer-events-none absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] text-night">
                    ✓
                  </div>
                )}

                {/* quick actions */}
                <div className="flex items-center justify-between gap-1 p-2">
                  {photo.status !== "approved" ? (
                    <Quick
                      onClick={() => run(() => setPhotoStatus(photo.id, "approved", eventId))}
                      disabled={pending}
                      className="text-emerald-700"
                    >
                      Approve
                    </Quick>
                  ) : (
                    <Quick
                      onClick={() => run(() => setPhotoStatus(photo.id, "rejected", eventId))}
                      disabled={pending}
                      className="text-amber-700"
                    >
                      Reject
                    </Quick>
                  )}
                  <Quick
                    onClick={() => run(() => deletePhoto(photo.id, eventId))}
                    disabled={pending}
                    className="text-red-700"
                  >
                    Delete
                  </Quick>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Quick({
  children,
  onClick,
  disabled,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`focus-gold rounded-md px-2 py-1 text-xs font-medium transition hover:bg-paper disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: PhotoStatus }) {
  const map: Record<PhotoStatus, string> = {
    pending: "bg-amber-500/90",
    approved: "bg-emerald-600/90",
    rejected: "bg-red-600/90",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium text-white ${map[status]}`}>
      {status}
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-night/70 px-2 py-0.5 text-[10px] font-medium text-paper">
      {children}
    </span>
  );
}
