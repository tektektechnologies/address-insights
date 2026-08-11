import type { SearchHistoryEntry } from "@/src/types";

/** Versioned localStorage key for personal recent-search history. */
export const SEARCH_HISTORY_KEY = "address-insights:history";

export const SEARCH_HISTORY_MAX_ENTRIES = 5;

const EMPTY_HISTORY: SearchHistoryEntry[] = [];

type HistoryListener = () => void;

const listeners = new Set<HistoryListener>();
let snapshot: SearchHistoryEntry[] = EMPTY_HISTORY;
let snapshotReady = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCoordinate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export function isSameSearchHistoryLocation(
  left: Pick<SearchHistoryEntry, "displayName" | "latitude" | "longitude">,
  right: Pick<SearchHistoryEntry, "displayName" | "latitude" | "longitude">,
): boolean {
  return (
    left.displayName === right.displayName &&
    left.latitude === right.latitude &&
    left.longitude === right.longitude
  );
}

export function parseSearchHistoryEntry(
  value: unknown,
): SearchHistoryEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.displayName !== "string") {
    return null;
  }

  const displayName = value.displayName.trim();
  if (!displayName) {
    return null;
  }

  const latitude = parseCoordinate(value.latitude);
  const longitude = parseCoordinate(value.longitude);
  if (latitude === null || longitude === null) {
    return null;
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  if (typeof value.searchedAt !== "string" || !value.searchedAt.trim()) {
    return null;
  }

  return {
    displayName,
    latitude,
    longitude,
    searchedAt: value.searchedAt.trim(),
  };
}

/** Drop malformed rows, dedupe identical locations, and enforce the max size. */
export function normalizeSearchHistoryEntries(
  raw: unknown,
): SearchHistoryEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const normalized: SearchHistoryEntry[] = [];

  for (const item of raw) {
    const entry = parseSearchHistoryEntry(item);
    if (!entry) {
      continue;
    }

    if (
      normalized.some((existing) =>
        isSameSearchHistoryLocation(existing, entry),
      )
    ) {
      continue;
    }

    normalized.push(entry);

    if (normalized.length >= SEARCH_HISTORY_MAX_ENTRIES) {
      break;
    }
  }

  return normalized;
}

/** Move a location to the front (or insert it), keeping at most five entries. */
export function upsertSearchHistoryEntry(
  existing: SearchHistoryEntry[],
  next: Omit<SearchHistoryEntry, "searchedAt"> & { searchedAt?: string },
): SearchHistoryEntry[] {
  const candidate = parseSearchHistoryEntry({
    displayName: next.displayName,
    latitude: next.latitude,
    longitude: next.longitude,
    searchedAt: next.searchedAt ?? new Date().toISOString(),
  });

  if (!candidate) {
    return normalizeSearchHistoryEntries(existing);
  }

  const withoutMatch = normalizeSearchHistoryEntries(existing).filter(
    (entry) => !isSameSearchHistoryLocation(entry, candidate),
  );

  return [candidate, ...withoutMatch].slice(0, SEARCH_HISTORY_MAX_ENTRIES);
}

export function buildInsightsUrl(
  entry: Pick<SearchHistoryEntry, "displayName" | "latitude" | "longitude">,
): string {
  const params = new URLSearchParams({
    lat: String(entry.latitude),
    lng: String(entry.longitude),
    address: entry.displayName,
  });

  return `/insights?${params.toString()}`;
}

function canUseLocalStorage(): boolean {
  try {
    if (
      typeof window === "undefined" ||
      typeof window.localStorage === "undefined"
    ) {
      return false;
    }

    const probeKey = "__address_insights_history_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function readSearchHistoryFromStorage(): SearchHistoryEntry[] {
  if (!canUseLocalStorage()) {
    return EMPTY_HISTORY;
  }

  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (raw === null || raw.trim() === "") {
      return EMPTY_HISTORY;
    }

    const normalized = normalizeSearchHistoryEntries(JSON.parse(raw) as unknown);
    return normalized.length === 0 ? EMPTY_HISTORY : normalized;
  } catch {
    return EMPTY_HISTORY;
  }
}

function writeSearchHistory(entries: SearchHistoryEntry[]): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    const normalized = normalizeSearchHistoryEntries(entries);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(normalized));
  } catch {
    // Quota or privacy mode failures must not crash the app.
  }
}

function setSnapshot(entries: SearchHistoryEntry[]): void {
  snapshot = entries.length === 0 ? EMPTY_HISTORY : entries;
  snapshotReady = true;
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeSearchHistory(listener: HistoryListener): () => void {
  listeners.add(listener);

  if (typeof window !== "undefined") {
    const onStorage = (event: StorageEvent) => {
      if (event.key === SEARCH_HISTORY_KEY || event.key === null) {
        setSnapshot(readSearchHistoryFromStorage());
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  return () => {
    listeners.delete(listener);
  };
}

export function getSearchHistorySnapshot(): SearchHistoryEntry[] {
  if (!snapshotReady) {
    snapshot = readSearchHistoryFromStorage();
    snapshotReady = true;
  }

  return snapshot;
}

export function getServerSearchHistorySnapshot(): SearchHistoryEntry[] {
  return EMPTY_HISTORY;
}

export function readSearchHistory(): SearchHistoryEntry[] {
  const entries = readSearchHistoryFromStorage();
  snapshot = entries;
  snapshotReady = true;
  return entries;
}

export function saveSearchHistoryEntry(
  entry: Omit<SearchHistoryEntry, "searchedAt"> & { searchedAt?: string },
): SearchHistoryEntry[] {
  const next = upsertSearchHistoryEntry(readSearchHistoryFromStorage(), entry);
  writeSearchHistory(next);
  setSnapshot(next.length === 0 ? EMPTY_HISTORY : next);
  return next;
}

export function clearSearchHistory(): void {
  if (canUseLocalStorage()) {
    try {
      window.localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  setSnapshot(EMPTY_HISTORY);
}
