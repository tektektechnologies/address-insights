/** Centralized Overpass endpoint so the provider can be swapped later. */
export const OVERPASS_API_URL = "https://overpass-api.de/api/interpreter";

/** Server-defined search radius; never accepted from the client. */
export const OVERPASS_SEARCH_RADIUS_METERS = 3500;

/** Overpass QL [timeout:...] budget in seconds. */
export const OVERPASS_QUERY_TIMEOUT_SECONDS = 25;

/** HTTP fetch abort timeout; slightly above the QL timeout. */
export const OVERPASS_FETCH_TIMEOUT_MS = 30_000;

/** Cap response size for the insights UI. */
export const OVERPASS_MAX_AMENITIES = 250;
