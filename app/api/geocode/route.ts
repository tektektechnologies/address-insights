import { NextResponse } from "next/server";

import {
  LOCATIONIQ_MAX_RESULTS,
  LOCATIONIQ_REQUEST_TIMEOUT_MS,
  LOCATIONIQ_SEARCH_URL,
} from "@/src/lib/locationiq/config";
import { parseLocationIqSearchResults } from "@/src/lib/locationiq/parse-geocode-response";

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

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q");

  if (rawQuery === null) {
    return jsonError("Query parameter q is required.", 400);
  }

  const query = rawQuery.trim();
  if (query.length < 3 || query.length > 200) {
    return jsonError("Query must be between 3 and 200 characters.", 400);
  }

  const token = process.env.LOCATIONIQ_TOKEN;
  if (!token) {
    return jsonError("Geocoding service is not configured.", 500);
  }

  // Build with URLSearchParams so user input and the token are safely encoded.
  const providerUrl = new URL(LOCATIONIQ_SEARCH_URL);
  providerUrl.search = new URLSearchParams({
    key: token,
    q: query,
    format: "json",
    limit: String(LOCATIONIQ_MAX_RESULTS),
  }).toString();

  let providerResponse: Response;

  try {
    providerResponse = await fetch(providerUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(LOCATIONIQ_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    if (isTimeoutError(error)) {
      return jsonError("Geocoding request timed out.", 504);
    }

    return jsonError("Failed to reach geocoding provider.", 502);
  }

  // LocationIQ commonly responds with 404 when nothing matches; treat as empty.
  if (providerResponse.status === 404) {
    return NextResponse.json({ results: [] });
  }

  if (!providerResponse.ok) {
    return jsonError("Geocoding provider returned an error.", 502);
  }

  let payload: unknown;

  try {
    payload = await providerResponse.json();
  } catch {
    return jsonError("Geocoding provider returned invalid data.", 502);
  }

  const results = parseLocationIqSearchResults(payload);
  return NextResponse.json({ results });
}
