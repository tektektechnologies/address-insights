import { NextResponse } from "next/server";

import { buildAmenitiesOverpassQuery } from "@/src/lib/overpass/build-query";
import {
  OVERPASS_API_URL,
  OVERPASS_FETCH_TIMEOUT_MS,
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

  let providerResponse: Response;

  try {
    providerResponse = await fetch(OVERPASS_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(OVERPASS_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return jsonError("Amenities request timed out.", 504);
    }

    return jsonError("Failed to reach amenities provider.", 502);
  }

  if (!providerResponse.ok) {
    return jsonError("Amenities provider returned an error.", 502);
  }

  let payload: unknown;

  try {
    payload = await providerResponse.json();
  } catch {
    return jsonError("Amenities provider returned invalid data.", 502);
  }

  const amenities = normalizeOverpassAmenities(payload, latitude, longitude);
  return NextResponse.json({ amenities });
}
