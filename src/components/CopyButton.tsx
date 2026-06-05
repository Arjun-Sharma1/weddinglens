"use client";

import { useState } from "react";

export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="focus-gold rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft transition hover:border-gold hover:text-gold-deep"
    >
      {copied ? "Copied ✓" : label}
    </button>
  );
}
