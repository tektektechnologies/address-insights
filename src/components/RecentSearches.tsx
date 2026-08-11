"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import {
  buildInsightsUrl,
  clearSearchHistory,
  getSearchHistorySnapshot,
  getServerSearchHistorySnapshot,
  subscribeSearchHistory,
} from "@/src/lib/history";

export function RecentSearches() {
  const entries = useSyncExternalStore(
    subscribeSearchHistory,
    getSearchHistorySnapshot,
    getServerSearchHistorySnapshot,
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <section
      aria-label="Recent searches"
      className="mt-6 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
          Recent searches
        </h2>
        <button
          type="button"
          onClick={() => {
            clearSearchHistory();
          }}
          className="text-sm font-medium text-[var(--ink-faint)] underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-muted)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Clear history
        </button>
      </div>

      <ul className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-white/90">
        {entries.map((entry) => (
          <li
            key={`${entry.latitude}:${entry.longitude}:${entry.displayName}`}
          >
            <Link
              href={buildInsightsUrl(entry)}
              className="flex w-full px-4 py-3.5 text-left text-base text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
            >
              {entry.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
