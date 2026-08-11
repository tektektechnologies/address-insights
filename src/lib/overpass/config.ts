/**
 * Primary + fallback Overpass interpreters.
 * Public instances are often busy; failover keeps the app usable.
 */
export const OVERPASS_API_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://gall.openstreetmap.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
] as const;

/** Overpass asks clients to identify themselves; anonymous Node UA is often throttled. */
export const OVERPASS_USER_AGENT =
  "AddressInsights/0.1 (neighborhood-insights; contact=local-dev)";

/** Server-defined search radius; never accepted from the client. */
export const OVERPASS_SEARCH_RADIUS_METERS = 3500;

/** Overpass QL [timeout:...] budget in seconds. */
export const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;

/** HTTP fetch abort timeout; slightly above the QL timeout. */
export const OVERPASS_FETCH_TIMEOUT_MS = 30_000;

/** Cap response size for the insights UI. */
export const OVERPASS_MAX_AMENITIES = 250;
