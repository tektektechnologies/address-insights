import { NextResponse } from "next/server";

import { buildAmenitiesOverpassQuery } from "@/src/lib/overpass/build-query";
import {
  OVERPASS_API_URLS,
  OVERPASS_FETCH_TIMEOUT_MS,
  OVERPASS_USER_AGENT,
} from "@/src/lib/overpass/config";
import { normalizeOverpassAmenities } from "@/src/lib/overpass/normalize-amenities";

type ErrorBody = {
  error: string;
};

function jsonError(message: string, status: number): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message }, { status });
}

function isTimeoutError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "TimeoutError" || error.name === "AbortError")
  );
}

/** Upstream statuses that are usually temporary overload / gateway issues. */
function isTransientProviderStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 429 ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

function parseBoundedCoordinate(
  raw: string | null,
  kind: "lat" | "lng",
): number | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    return null;
  }

  if (kind === "lat" && (value < -90 || value > 90)) {
    return null;
  }

  if (kind === "lng" && (value < -180 || value > 180)) {
    return null;
  }

  return value;
}

async function fetchOverpass(
  endpoint: string,
  body: URLSearchParams,
): Promise<Response> {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      "User-Agent": OVERPASS_USER_AGENT,
    },
    body,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(OVERPASS_FETCH_TIMEOUT_MS),
  });
}

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const latitude = parseBoundedCoordinate(searchParams.get("lat"), "lat");
  const longitude = parseBoundedCoordinate(searchParams.get("lng"), "lng");

  if (latitude === null || longitude === null) {
    return jsonError(
      "Query parameters lat and lng must be finite numbers within valid ranges.",
      400,
    );
  }

  // Only validated numeric coordinates are embedded in the Overpass QL string.
  const query = buildAmenitiesOverpassQuery(latitude, longitude);
  const body = new URLSearchParams({ data: query });

  let transientFailures = 0;
  let hardFailures = 0;

  for (const endpoint of OVERPASS_API_URLS) {
    let providerResponse: Response;

    try {
      providerResponse = await fetchOverpass(endpoint, body);
    } catch (error) {
      if (isTimeoutError(error)) {
        console.warn(`Overpass request timed out for ${endpoint}`);
        transientFailures += 1;
        continue;
      }

      console.warn(`Overpass network failure for ${endpoint}`);
      hardFailures += 1;
      continue;
    }

    if (!providerResponse.ok) {
      const { status } = providerResponse;
      console.warn(`Overpass non-OK response from ${endpoint}: ${status}`);

      if (isTransientProviderStatus(status)) {
        transientFailures += 1;
      } else {
        hardFailures += 1;
      }

      // Drain the body so the connection can close cleanly, then try a mirror.
      await providerResponse.arrayBuffer().catch(() => undefined);
      continue;
    }

    let payload: unknown;

    try {
      payload = await providerResponse.json();
    } catch {
      hardFailures += 1;
      continue;
    }

    const amenities = normalizeOverpassAmenities(payload, latitude, longitude);
    return NextResponse.json({ amenities });
  }

  // Prefer a retryable timeout response when providers were only slow/overloaded.
  if (transientFailures > 0 && hardFailures === 0) {
    return jsonError(
      "The amenities service is busy or timed out. Please try again in a moment.",
      504,
    );
  }

  if (transientFailures >= hardFailures) {
    return jsonError(
      "The amenities service is busy or timed out. Please try again in a moment.",
      504,
    );
  }

  return jsonError(
    "Amenities data is temporarily unavailable. Please try again.",
    502,
  );
}
