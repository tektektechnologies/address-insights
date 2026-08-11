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

    results.push({
      id: item.id,
      displayName: item.displayName,
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

  const [address, setAddress] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const query = address.trim();
    setError(null);
    setStatusMessage(null);
    setResults([]);

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
            : parsed.error || "Something went wrong while searching. Please try again.",
        );
        return;
      }

      if (!response.ok) {
        setError("Something went wrong while searching. Please try again.");
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
      setError("Network error while searching. Check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSelectResult(result: LocationResult) {
    const params = new URLSearchParams({
      lat: String(result.latitude),
      lng: String(result.longitude),
      address: result.displayName,
    });

    router.push(`/insights?${params.toString()}`);
  }

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4"
        aria-busy={isLoading}
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
              disabled={isLoading}
              aria-invalid={error ? true : undefined}
              aria-describedby={
                [error ? errorId : null, statusMessage ? statusId : null]
                  .filter(Boolean)
                  .join(" ") || undefined
              }
              className="min-h-12 w-full flex-1 rounded-xl border border-[var(--line)] bg-white px-4 text-base text-[var(--ink)] shadow-[0_1px_0_rgba(15,23,42,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink-faint)] focus-visible:border-[var(--accent)] focus-visible:ring-2 focus-visible:ring-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] px-6 text-base font-semibold text-white transition-[background-color,transform,opacity] hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? "Searching…" : "Search"}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-4 text-sm text-[var(--danger)]"
        >
          {error}
        </p>
      ) : null}

      {statusMessage ? (
        <p
          id={statusId}
          role="status"
          className="mt-4 text-sm text-[var(--ink-muted)]"
        >
          {statusMessage}
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-6 animate-[rise_280ms_ease-out]">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--ink-muted)] uppercase">
            Matching addresses
          </h2>
          <ul className="mt-3 divide-y divide-[var(--line)] rounded-xl border border-[var(--line)] bg-white/90">
            {results.map((result) => (
              <li key={result.id}>
                <button
                  type="button"
                  onClick={() => handleSelectResult(result)}
                  className="flex w-full items-start px-4 py-3.5 text-left text-base text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent)]"
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
