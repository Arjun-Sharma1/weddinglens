"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
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
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
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
          {visible.map((photo, index) => {
            const isSel = selected.has(photo.id);
            return (
              <div
                key={photo.id}
                className={`group relative overflow-hidden rounded-xl border bg-paper-deep/20 transition ${
                  isSel ? "border-gold ring-2 ring-gold/40" : "border-line"
                }`}
              >
                <button
                  onClick={() => setPreviewIndex(index)}
                  className="block w-full cursor-zoom-in"
                  aria-label="Preview photo"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicPhotoUrl(photo.thumb_path)}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                  {/* zoom hint on hover */}
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-night/0 opacity-0 transition group-hover:bg-night/20 group-hover:opacity-100">
                    <span className="rounded-full bg-night/70 px-3 py-1 text-xs font-medium text-paper">
                      View full
                    </span>
                  </span>
                </button>

                {/* selection checkbox */}
                <button
                  onClick={() => toggle(photo.id)}
                  aria-label={isSel ? "Deselect photo" : "Select photo"}
                  aria-pressed={isSel}
                  className={`absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full border text-[11px] backdrop-blur transition ${
                    isSel
                      ? "border-gold bg-gold text-night"
                      : "border-paper/70 bg-night/40 text-paper opacity-0 group-hover:opacity-100"
                  }`}
                >
                  {isSel ? "✓" : ""}
                </button>

                {/* status + quality badges */}
                <div className="pointer-events-none absolute left-2 top-2 flex gap-1">
                  <StatusBadge status={photo.status} />
                  {photo.is_blurry && <Tag>blurry</Tag>}
                  {photo.is_dark && <Tag>dark</Tag>}
                </div>

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

      {previewIndex !== null && visible[previewIndex] && (
        <Lightbox
          photos={visible}
          index={previewIndex}
          eventId={eventId}
          pending={pending}
          onIndexChange={setPreviewIndex}
          onClose={() => setPreviewIndex(null)}
          onAction={run}
        />
      )}
    </div>
  );
}

function Lightbox({
  photos,
  index,
  eventId,
  pending,
  onIndexChange,
  onClose,
  onAction,
}: {
  photos: PhotoRow[];
  index: number;
  eventId: string;
  pending: boolean;
  onIndexChange: (i: number) => void;
  onClose: () => void;
  onAction: (fn: () => Promise<unknown>) => void;
}) {
  const photo = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

  const go = useCallback(
    (delta: number) => {
      const next = index + delta;
      if (next >= 0 && next < photos.length) onIndexChange(next);
    },
    [index, photos.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const meta = [
    photo.width && photo.height ? `${photo.width}×${photo.height}` : null,
    photo.quality_score != null ? `quality ${Math.round(photo.quality_score)}` : null,
    photo.captured_at
      ? new Date(photo.captured_at).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null,
  ].filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-night/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Photo preview"
      onClick={onClose}
    >
      {/* top bar */}
      <div
        className="flex items-center gap-3 px-4 py-3 text-paper"
        onClick={(e) => e.stopPropagation()}
      >
        <StatusBadge status={photo.status} />
        {photo.is_blurry && <Tag>blurry</Tag>}
        {photo.is_dark && <Tag>dark</Tag>}
        <span className="ml-auto text-xs text-paper/60">
          {index + 1} / {photos.length}
        </span>
        <button
          onClick={onClose}
          aria-label="Close preview"
          className="focus-gold grid h-8 w-8 place-items-center rounded-full bg-paper/10 text-lg text-paper hover:bg-paper/20"
        >
          ✕
        </button>
      </div>

      {/* image stage */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4"
        onClick={(e) => e.stopPropagation()}
      >
        {hasPrev && (
          <button
            onClick={() => go(-1)}
            aria-label="Previous photo"
            className="focus-gold absolute left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/10 text-2xl text-paper hover:bg-paper/20 sm:left-6"
          >
            ‹
          </button>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={publicPhotoUrl(photo.display_path)}
          alt=""
          className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        />

        {hasNext && (
          <button
            onClick={() => go(1)}
            aria-label="Next photo"
            className="focus-gold absolute right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-paper/10 text-2xl text-paper hover:bg-paper/20 sm:right-6"
          >
            ›
          </button>
        )}
      </div>

      {/* bottom bar: meta + actions */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {meta.length > 0 && (
          <p className="text-xs text-paper/60">{meta.join(" · ")}</p>
        )}
        <div className="ml-auto flex flex-wrap gap-2">
          {photo.status !== "approved" && (
            <button
              disabled={pending}
              onClick={() => onAction(() => setPhotoStatus(photo.id, "approved", eventId))}
              className="focus-gold rounded-full bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Approve
            </button>
          )}
          {photo.status !== "rejected" && (
            <button
              disabled={pending}
              onClick={() => onAction(() => setPhotoStatus(photo.id, "rejected", eventId))}
              className="focus-gold rounded-full bg-amber-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
            >
              Reject
            </button>
          )}
          <a
            href={publicPhotoUrl(photo.original_path)}
            target="_blank"
            rel="noopener noreferrer"
            className="focus-gold rounded-full border border-paper/30 px-4 py-1.5 text-sm font-medium text-paper hover:bg-paper/10"
          >
            Original
          </a>
          <button
            disabled={pending}
            onClick={() => onAction(() => deletePhoto(photo.id, eventId))}
            className="focus-gold rounded-full bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </div>
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
