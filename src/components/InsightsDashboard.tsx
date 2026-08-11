"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CopyLinkButton } from "@/src/components/CopyLinkButton";
import { MapView } from "@/src/components/MapView";
import { formatAmenityCategory, formatDistance } from "@/src/lib/format";
import { saveSearchHistoryEntry } from "@/src/lib/history";
import { parseInsightsLocation } from "@/src/lib/insights-location";
import {
  calculateInsightScores,
  getAmenityCategoryBreakdown,
} from "@/src/lib/scoring";
import type { Amenity, AmenityCategory, InsightScores } from "@/src/types";

const AMENITY_CATEGORIES = new Set<AmenityCategory>([
  "restaurant",
  "cafe",
  "grocery",
  "pharmacy",
  "healthcare",
  "park",
  "fitness",
  "entertainment",
  "education",
  "transit",
  "other",
]);

function isAmenityCategory(value: string): value is AmenityCategory {
  return AMENITY_CATEGORIES.has(value as AmenityCategory);
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; amenities: Amenity[]; scores: InsightScores };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseAmenitiesResponse(
  data: unknown,
): { amenities: Amenity[] } | { error: string } {
  if (!isRecord(data)) {
    return { error: "Unexpected response from the amenities service." };
  }

  if (typeof data.error === "string" && data.error.trim()) {
    return { error: data.error };
  }

  if (!Array.isArray(data.amenities)) {
    return { error: "Unexpected response from the amenities service." };
  }

  const amenities: Amenity[] = [];

  for (const item of data.amenities) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      typeof item.id !== "string" ||
      typeof item.name !== "string" ||
      typeof item.category !== "string" ||
      !isAmenityCategory(item.category) ||
      typeof item.latitude !== "number" ||
      typeof item.longitude !== "number" ||
      typeof item.distanceMeters !== "number" ||
      !Number.isFinite(item.latitude) ||
      !Number.isFinite(item.longitude) ||
      !Number.isFinite(item.distanceMeters)
    ) {
      continue;
    }

    const trimmedName = item.name.trim();

    amenities.push({
      id: item.id,
      name: trimmedName || `Unnamed ${item.category}`,
      category: item.category,
      latitude: item.latitude,
      longitude: item.longitude,
      distanceMeters: item.distanceMeters,
    });
  }

  return { amenities };
}

function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-x-hidden bg-[var(--canvas)] text-[var(--ink)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.12),_transparent_55%),linear-gradient(180deg,_#eef5f4_0%,_#f7faf9_45%,_#edf2f1_100%)]"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-4xl min-w-0 flex-1 flex-col px-4 py-8 sm:px-8 sm:py-12">
        {children}
      </div>
    </div>
  );
}

function SearchAnotherLink() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--accent-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
    >
      Search another address
    </Link>
  );
}

function InvalidLinkState() {
  return (
    <PageShell>
      <div className="my-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-5 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] sm:p-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight break-words">
          This insights link is invalid
        </h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-[var(--ink-muted)]">
          The address or coordinates in this URL are missing or malformed. Start
          a new search to generate a shareable insights page.
        </p>
        <div className="mt-6">
          <SearchAnotherLink />
        </div>
      </div>
    </PageShell>
  );
}

function LoadingSkeleton({ address }: { address: string }) {
  return (
    <PageShell>
      <header>
        <p className="text-sm font-medium tracking-wide text-[var(--ink-faint)] uppercase">
          Address Insights
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">
          {address}
        </h1>
        <p className="mt-3 text-sm text-[var(--ink-muted)]" role="status">
          Loading nearby amenities…
        </p>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-2xl border border-[var(--line)] bg-white/80"
          />
        ))}
      </div>
      <div className="mt-8 h-40 animate-pulse rounded-2xl border border-[var(--line)] bg-white/80" />
      <div className="mt-4 h-56 animate-pulse rounded-2xl border border-[var(--line)] bg-white/80" />
    </PageShell>
  );
}

export function InsightsDashboard() {
  const searchParams = useSearchParams();
  const location = useMemo(
    () => parseInsightsLocation(searchParams),
    [searchParams],
  );

  const [retryKey, setRetryKey] = useState(0);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!location) {
      return;
    }

    const selectedLocation = location;
    const controller = new AbortController();

    async function loadAmenities() {
      setLoadState({ status: "loading" });

      try {
        const params = new URLSearchParams({
          lat: String(selectedLocation.latitude),
          lng: String(selectedLocation.longitude),
        });

        const response = await fetch(`/api/amenities?${params.toString()}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        });

        let payload: unknown;

        try {
          payload = await response.json();
        } catch {
          if (!controller.signal.aborted) {
            setLoadState({
              status: "error",
              message:
                "Could not read the amenities response. Please try again.",
            });
          }
          return;
        }

        const parsed = parseAmenitiesResponse(payload);

        if ("error" in parsed) {
          if (!controller.signal.aborted) {
            setLoadState({
              status: "error",
              message: response.ok
                ? parsed.error
                : parsed.error ||
                  "Something went wrong while loading amenities. Please try again.",
            });
          }
          return;
        }

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setLoadState({
              status: "error",
              message:
                "Something went wrong while loading amenities. Please try again.",
            });
          }
          return;
        }

        if (!controller.signal.aborted) {
          setLoadState({
            status: "ready",
            amenities: parsed.amenities,
            scores: calculateInsightScores(parsed.amenities),
          });
        }
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setLoadState({
          status: "error",
          message:
            error instanceof Error && error.name === "AbortError"
              ? "The amenities request was cancelled. Please try again."
              : "Network error while loading amenities. Check your connection and try again.",
        });
      }
    }

    void loadAmenities();

    return () => {
      controller.abort();
    };
  }, [location, retryKey]);

  useEffect(() => {
    if (!location || loadState.status !== "ready") {
      return;
    }

    // Personal browser history only — never used to reconstruct shared pages.
    saveSearchHistoryEntry({
      displayName: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
    });
  }, [location, loadState.status]);

  if (!location) {
    return <InvalidLinkState />;
  }

  if (loadState.status === "loading") {
    return <LoadingSkeleton address={location.address} />;
  }

  if (loadState.status === "error") {
    const isTimeout = /timed out|busy|taking too long/i.test(loadState.message);

    return (
      <PageShell>
        <header>
          <p className="text-sm font-medium tracking-wide text-[var(--ink-faint)] uppercase">
            Address Insights
          </p>
          <h1 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">
            {location.address}
          </h1>
        </header>

        <div
          className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-5 sm:p-8"
          role="alert"
        >
          <h2 className="text-lg font-semibold text-[var(--ink)]">
            {isTimeout
              ? "This is taking longer than usual"
              : "We couldn&apos;t load nearby amenities"}
          </h2>
          <p className="mt-2 text-base leading-relaxed break-words text-[var(--ink-muted)]">
            {isTimeout ? (
              loadState.message
            ) : (
              <>
                <span className="font-semibold text-[var(--danger)]">
                  Error:{" "}
                </span>
                {loadState.message}
              </>
            )}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-faint)]">
            {isTimeout
              ? "OpenStreetMap amenity servers are sometimes busy. Waiting a moment and retrying usually works."
              : "You can retry this request or search for a different address."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setRetryKey((value) => value + 1)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]"
            >
              Try again
            </button>
            <SearchAnotherLink />
          </div>
        </div>
      </PageShell>
    );
  }

  const { amenities, scores } = loadState;
  const breakdown = getAmenityCategoryBreakdown(amenities)
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  const nearest = [...amenities]
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 10);

  return (
    <PageShell>
      <header>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium tracking-wide text-[var(--ink-faint)] uppercase">
              Address Insights
            </p>
            <h1 className="mt-2 font-display text-3xl leading-tight font-semibold tracking-tight break-words sm:text-4xl">
              {location.address}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-start gap-3">
            <CopyLinkButton />
            <SearchAnotherLink />
          </div>
        </div>
      </header>

      <section aria-labelledby="insight-scores-heading" className="mt-8">
        <h2 id="insight-scores-heading" className="sr-only">
          Insight scores
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)]">
            <h3 className="text-sm font-medium text-[var(--ink-muted)]">
              Walking Score
            </h3>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-[var(--accent)]">
              <span className="sr-only">Walking score </span>
              {scores.walking}
              <span className="ml-1 text-2xl font-medium text-[var(--ink-faint)]">
                <span aria-hidden="true">/ 100</span>
                <span className="sr-only"> out of 100</span>
              </span>
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)]">
            <h3 className="text-sm font-medium text-[var(--ink-muted)]">
              Driving Score
            </h3>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-[var(--accent)]">
              <span className="sr-only">Driving score </span>
              {scores.driving}
              <span className="ml-1 text-2xl font-medium text-[var(--ink-faint)]">
                <span aria-hidden="true">/ 100</span>
                <span className="sr-only"> out of 100</span>
              </span>
            </p>
          </article>

          <article className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-5 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.45)]">
            <h3 className="text-sm font-medium text-[var(--ink-muted)]">
              Urban Index
            </h3>
            <p className="mt-3 font-display text-5xl font-semibold tracking-tight text-[var(--accent)]">
              <span className="sr-only">Urban index </span>
              {scores.urbanIndex}
              <span className="ml-1 text-2xl font-medium text-[var(--ink-faint)]">
                <span aria-hidden="true">/ 100</span>
                <span className="sr-only"> out of 100</span>
              </span>
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--ink)]">
              Density label: {scores.urbanLabel}
            </p>
          </article>
        </div>
      </section>

      <p className="mt-5 text-sm leading-relaxed text-[var(--ink-faint)]">
        Scores are heuristic estimates based on nearby amenities, not official
        walkability ratings or actual travel times.
      </p>

      {amenities.length === 0 ? (
        <p
          role="status"
          className="mt-4 rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3 text-sm text-[var(--ink-muted)]"
        >
          No nearby amenities were found in OpenStreetMap data for this area.
          Scores may be low as a result.
        </p>
      ) : null}

      <section className="mt-8 min-w-0" aria-labelledby="map-heading">
        <h2 id="map-heading" className="mb-3 text-lg font-semibold tracking-tight">
          Map
        </h2>
        <div className="max-w-full overflow-hidden">
          <MapView
            latitude={location.latitude}
            longitude={location.longitude}
            address={location.address}
            amenities={amenities}
          />
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-4 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          How we calculate this
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--ink-muted)]">
          <li>
            Walking considers nearby POIs within about 1 km and favors closer
            places.
          </li>
          <li>
            Driving considers a broader radius up to about 3.5 km and category
            diversity.
          </li>
          <li>
            Urban index uses nearby amenity density and diversity.
          </li>
        </ul>
      </section>

      <section className="mt-6 min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-4 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Nearby amenity breakdown
        </h2>
        {breakdown.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            No amenities were found within the search radius.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {breakdown.map((item) => (
              <li
                key={item.category}
                className="flex min-w-0 items-center justify-between gap-3 rounded-xl bg-[var(--canvas)] px-3 py-2 text-sm"
              >
                <span className="min-w-0 break-words text-[var(--ink)]">
                  {formatAmenityCategory(item.category)}
                </span>
                <span className="shrink-0 font-semibold text-[var(--ink-muted)]">
                  {item.count}
                  <span className="sr-only"> places</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-6 mb-4 min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)]/95 p-4 sm:p-6">
        <h2 className="text-lg font-semibold tracking-tight">
          Nearest amenities
        </h2>
        {nearest.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-muted)]">
            No nearby places to list yet.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-[var(--line)]">
            {nearest.map((amenity, index) => (
              <li
                key={amenity.id}
                className="flex min-w-0 flex-col gap-1 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="font-medium break-words text-[var(--ink)]">
                    <span className="mr-2 text-[var(--ink-faint)]">
                      {index + 1}.
                    </span>
                    {amenity.name}
                  </p>
                  <p className="mt-0.5 text-sm text-[var(--ink-muted)]">
                    {formatAmenityCategory(amenity.category)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-semibold text-[var(--ink-muted)]">
                  {formatDistance(amenity.distanceMeters)}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      <footer className="mt-auto pt-6 text-sm text-[var(--ink-faint)]">
        <p>
          Amenity data ©{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-muted)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            OpenStreetMap
          </a>{" "}
          contributors. Search by{" "}
          <a
            href="https://locationiq.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--line-strong)] underline-offset-2 transition-colors hover:text-[var(--ink-muted)] focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          >
            LocationIQ
          </a>
          .
        </p>
      </footer>
    </PageShell>
  );
}
