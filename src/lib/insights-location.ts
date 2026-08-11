export type InsightsLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

/** Parse shareable insights URL params; returns null when the link is invalid. */
export function parseInsightsLocation(
  params: Pick<URLSearchParams, "get">,
): InsightsLocation | null {
  const latRaw = params.get("lat");
  const lngRaw = params.get("lng");
  const addressRaw = params.get("address");

  if (latRaw === null || lngRaw === null || addressRaw === null) {
    return null;
  }

  const address = addressRaw.trim();
  if (!address) {
    return null;
  }

  const latitude = Number(latRaw);
  const longitude = Number(lngRaw);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  if (
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return {
    latitude,
    longitude,
    address,
  };
}
