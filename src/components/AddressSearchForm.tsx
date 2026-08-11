"use client";

import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent } from "react";

import type { LocationResult } from "@/src/types";

type GeocodeSuccess = {
  results: LocationResult[];
};

type GeocodeError = {
  error: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseGeocodeResponse(data: unknown): GeocodeSuccess | GeocodeError {
  if (!isRecord(data)) {
    return { error: "Unexpected response from the geocoding service." };
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return { error: data.error };
  }

  if (!Array.isArray(data.results)) {
    return { error: "Unexpected response from the geocoding service." };
  }

  const results: LocationResult[] = [];

  for (const item of data.results) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      typeof item.id !== "string" ||
      typeof item.displayName !== "string" ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      !Number.isFinite(item.latitude) ||
      !Number.isFinite(item.longitude)
    ) {
      continue;
    }

    const displayName = item.displayName.trim();
    if (!displayName) {
      continue;
    }

    results.push({
      id: item.id,
      displayName,
      latitude: item.latitude,
      longitude: item.longitude,
    });
  }

  return { results };
}

export function AddressSearchForm() {
  const router = useRouter();
  const inputId = useId();
  const errorId = useId();
  const statusId = useId();
  const loadingStatusId = useId();

  const [address, setAddress] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading || isNavigating) {
      return;
    }

    const query = address.trim();
    setError(null);
    setStatusMessage(null);
    setResults([]);

    if (query.length === 0) {
      setError("Enter a street address to search.");
      return;
    }

    if (query.length < 3) {
      setError("Enter at least 3 characters of a street address.");
      return;
    }

    if (query.length > 200) {
      setError("Address must be 200 characters or fewer.");
      return;
    }

    setIsLoading(true);

    try {
      const params = new URLSearchParams({ q: query });
      const response = await fetch(`/api/geocode?${params.toString()}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      let payload: unknown;

      try {
        payload = await response.json();
      } catch {
        setError("Could not read the geocoding response. Please try again.");
        return;
      }

      const parsed = parseGeocodeResponse(payload);

      if ("error" in parsed) {
        setError(
          response.ok
            ? parsed.error
            : parsed.error ||
                "The address search service is unavailable. Please try again.",
        );
        return;
      }

      if (!response.ok) {
        setError(
          "The address search service is unavailable. Please try again.",
        );
        return;
      }

      if (parsed.results.length === 0) {
        setStatusMessage(
          "No matching address was found. Try a more complete street address.",
        );
        return;
      }

      setResults(parsed.results.slice(0, 5));
    } catch {
      setError(
        "Network error while searching. Check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectResult(result: LocationResult) {
    if (isNavigating) {
      return;
    }

    setIsNavigating(true);

    const params = new URLSearchParams({
      lat: String(result.latitude),
      lng: String(result.longitude),
      address: result.displayName,
    });

    router.push(`/insights?${params.toString()}`);
  }

  const describedBy = [
    error ? errorId : null,
    statusMessage ? statusId : null,
    isLoading ? loadingStatusId : null,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="w-full min-w-0">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        aria-busy={isLoading || isNavigating}
      >
        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--ink-muted)]"
          >
            Street address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id={inputId}
              name="address"
              type="text"
              autoComplete="street-address"
              placeholder="e.g. 1600 Pennsylvania Avenue NW, Washington, DC"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              disabled={isLoading || isNavigating}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy || undefined}
              className="min-h-12 w-full min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-white px-4 text-base text-[var(--ink)] shadow-[0_1px_0_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={isLoading || isNavigating}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-base font-semibold text-white transition-[background-color,opacity] hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </form>

      <p id={loadingStatusId} className="sr-only" aria-live="polite">
        {isLoading
          ? "Searching for matching addresses."
          : isNavigating
            ? "Opening address insights."
            : ""}
      </p>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-4 text-sm leading-relaxed break-words text-[var(--danger)]"
        >
          <span className="font-semibold">Error: </span>
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          id={statusId}
          role="status"
          className="mt-4 text-sm leading-relaxed break-words text-[var(--ink-muted)]"
        >
          {statusMessage}
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-6 min-w-0">
          <h3 className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            Matching addresses
          </h3>
          <ul className="mt-3 divide-y divide-[var(--line)] overflow-hidden rounded-xl border border-[var(--line)] bg-white/90">
            {results.map((result) => (
              <li key={result.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  disabled={isNavigating}
                  className="flex w-full min-w-0 items-start px-4 py-3.5 text-left text-base break-words text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)] disabled:cursor-wait disabled:opacity-70"
                >
                  {result.displayName}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
