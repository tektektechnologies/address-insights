import { describe, expect, it } from "vitest";

import {
  normalizeSearchHistoryEntries,
  upsertSearchHistoryEntry,
} from "@/src/lib/history";
import type { SearchHistoryEntry } from "@/src/types";

const baseEntry: SearchHistoryEntry = {
  displayName: "1 Main St",
  latitude: 40.7,
  longitude: -74.0,
  searchedAt: "2026-01-01T00:00:00.000Z",
};

describe("normalizeSearchHistoryEntries", () => {
  it("returns an empty list for non-array input", () => {
    expect(normalizeSearchHistoryEntries(null)).toEqual([]);
    expect(normalizeSearchHistoryEntries("{}")).toEqual([]);
    expect(normalizeSearchHistoryEntries({ entries: [] })).toEqual([]);
  });

  it("drops malformed entries and keeps valid ones", () => {
    const normalized = normalizeSearchHistoryEntries([
      baseEntry,
      { displayName: "Missing coords", searchedAt: "2026-01-02T00:00:00.000Z" },
      {
        displayName: "  ",
        latitude: 1,
        longitude: 2,
        searchedAt: "2026-01-03T00:00:00.000Z",
      },
      {
        displayName: "2 Oak Ave",
        latitude: 41.1,
        longitude: -73.9,
        searchedAt: "2026-01-04T00:00:00.000Z",
      },
      {
        displayName: "Bad lat",
        latitude: 120,
        longitude: -73.9,
        searchedAt: "2026-01-05T00:00:00.000Z",
      },
    ]);

    expect(normalized).toEqual([
      baseEntry,
      {
        displayName: "2 Oak Ave",
        latitude: 41.1,
        longitude: -73.9,
        searchedAt: "2026-01-04T00:00:00.000Z",
      },
    ]);
  });

  it("deduplicates identical locations and caps at five entries", () => {
    const entries = Array.from({ length: 7 }, (_, index) => ({
      displayName: `Place ${index}`,
      latitude: 40 + index * 0.01,
      longitude: -74,
      searchedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
    }));

    entries.splice(2, 0, { ...entries[0] });

    const normalized = normalizeSearchHistoryEntries(entries);
    expect(normalized).toHaveLength(5);
    expect(normalized[0]?.displayName).toBe("Place 0");
    expect(
      normalized.filter((entry) => entry.displayName === "Place 0"),
    ).toHaveLength(1);
  });
});

describe("upsertSearchHistoryEntry", () => {
  it("moves a matching location to the top instead of duplicating it", () => {
    const existing: SearchHistoryEntry[] = [
      {
        displayName: "A",
        latitude: 1,
        longitude: 2,
        searchedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        displayName: "B",
        latitude: 3,
        longitude: 4,
        searchedAt: "2026-01-02T00:00:00.000Z",
      },
    ];

    const next = upsertSearchHistoryEntry(existing, {
      displayName: "B",
      latitude: 3,
      longitude: 4,
      searchedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(next).toEqual([
      {
        displayName: "B",
        latitude: 3,
        longitude: 4,
        searchedAt: "2026-02-01T00:00:00.000Z",
      },
      {
        displayName: "A",
        latitude: 1,
        longitude: 2,
        searchedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("prepends a new location and enforces the maximum size", () => {
    const existing: SearchHistoryEntry[] = Array.from(
      { length: 5 },
      (_, index) => ({
        displayName: `Old ${index}`,
        latitude: index,
        longitude: index,
        searchedAt: `2026-01-0${index + 1}T00:00:00.000Z`,
      }),
    );

    const next = upsertSearchHistoryEntry(existing, {
      displayName: "Newest",
      latitude: 10,
      longitude: 11,
      searchedAt: "2026-03-01T00:00:00.000Z",
    });

    expect(next).toHaveLength(5);
    expect(next[0]?.displayName).toBe("Newest");
    expect(next.some((entry) => entry.displayName === "Old 4")).toBe(false);
  });
});
