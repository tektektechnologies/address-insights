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
      aria-labelledby="recent-searches-heading"
      className="mt-6 min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/90 p-4 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="recent-searches-heading"
          className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase"
        >
          Recent searches
        </h2>
        <button
          type="button"
          onClick={() => {
            clearSearchHistory();
          }}
          className="shrink-0 text-sm font-medium text-[var(--ink-faint)] underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-muted)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          Clear history
        </button>
      </div>

      <ul className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-white/90">
        {entries.map((entry) => (
          <li
            key={`${entry.latitude}:${entry.longitude}:${entry.displayName}`}
            className="min-w-0"
          >
            <Link
              href={buildInsightsUrl(entry)}
              className="flex w-full min-w-0 px-4 py-3.5 text-left text-base break-words text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
            >
              {entry.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
