/** Centralized LocationIQ endpoints so the provider can be swapped later. */
export const LOCATIONIQ_SEARCH_URL = "https://us1.locationiq.com/v1/search";

export const LOCATIONIQ_MAX_RESULTS = 5;

/** Bound external wait time so a slow provider cannot hang the route. */
export const LOCATIONIQ_REQUEST_TIMEOUT_MS = 15_000;
