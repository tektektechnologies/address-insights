import type { LocationResult } from "@/src/types";

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

function toLocationResult(value: unknown): LocationResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const latitude = parseCoordinate(value.lat);
  const longitude = parseCoordinate(value.lon);
  if (latitude === null || longitude === null) {
    return null;
  }

  // Discard coordinates outside valid geographic ranges.
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return null;
  }

  const displayName =
    typeof value.display_name === "string" ? value.display_name.trim() : "";
  if (!displayName) {
    return null;
  }

  if (value.place_id === undefined || value.place_id === null) {
    return null;
  }

  const id = String(value.place_id).trim();
  if (!id) {
    return null;
  }

  return {
    id,
    displayName,
    latitude,
    longitude,
  };
}

/** Map LocationIQ search JSON into LocationResult, dropping malformed rows. */
export function parseLocationIqSearchResults(data: unknown): LocationResult[] {
  if (!Array.isArray(data)) {
    return [];
  }

  const results: LocationResult[] = [];

  for (const item of data) {
    const parsed = toLocationResult(item);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}
