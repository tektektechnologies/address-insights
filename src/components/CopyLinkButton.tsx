"use client";

import { useEffect, useRef, useState } from "react";

type CopyStatus = "idle" | "copied" | "failed";

export function CopyLinkButton() {
  const [status, setStatus] = useState<CopyStatus>("idle");
  const resetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  async function handleCopy() {
    let nextStatus: CopyStatus = "failed";

    try {
      const url = window.location.href;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        nextStatus = "copied";
      }
    } catch {
      nextStatus = "failed";
    }

    setStatus(nextStatus);

    if (resetTimeoutRef.current !== null) {
      window.clearTimeout(resetTimeoutRef.current);
    }

    resetTimeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, 2000);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
      >
        Copy link
      </button>
      <p
        aria-live="polite"
        className="absolute top-full right-0 mt-1 whitespace-nowrap text-sm text-[var(--ink-muted)]"
      >
        {status === "copied"
          ? "Link copied"
          : status === "failed"
            ? "Could not copy link"
            : ""}
      </p>
    </div>
  );
}
