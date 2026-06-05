"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserClient } from "@/lib/supabase/browser";
import type { PhotoRow } from "@/lib/types";

interface StreamState {
  photos: PhotoRow[]; // newest first
  latestId: string | null; // most-recently-arrived photo (for spotlight)
}

/**
 * Subscribe to approved photos for an event in real time.
 * Seeds from `initial` (server-rendered) and applies INSERT/UPDATE/DELETE
 * deltas. RLS guarantees we only ever receive approved rows.
 */
export function usePhotoStream(
  eventId: string,
  initial: PhotoRow[],
): StreamState {
  const [photos, setPhotos] = useState<PhotoRow[]>(initial);
  const [latestId, setLatestId] = useState<string | null>(null);
  // Poll fallback only kicks in if the socket never connects.
  const connectedRef = useRef(false);

  useEffect(() => {
    const supabase = getBrowserClient();

    const upsert = (row: PhotoRow) =>
      setPhotos((prev) => {
        if (row.status !== "approved") {
          return prev.filter((p) => p.id !== row.id);
        }
        const without = prev.filter((p) => p.id !== row.id);
        const next = [row, ...without];
        next.sort((a, b) => b.created_at.localeCompare(a.created_at));
        return next;
      });

    const channel = supabase
      .channel(`photos:${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "photos",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string })?.id;
            if (id) setPhotos((prev) => prev.filter((p) => p.id !== id));
            return;
          }
          const row = payload.new as PhotoRow;
          if (payload.eventType === "INSERT" && row.status === "approved") {
            setLatestId(row.id);
          }
          if (payload.eventType === "UPDATE" && row.status === "approved") {
            setLatestId(row.id);
          }
          upsert(row);
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") connectedRef.current = true;
      });

    // Safety-net poll (every 8s) in case the realtime socket drops.
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("photos")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(500);
      if (data) setPhotos(data as PhotoRow[]);
    }, 8000);

    return () => {
      clearInterval(poll);
      supabase.removeChannel(channel);
    };
  }, [eventId]);

  return { photos, latestId };
}
