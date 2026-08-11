const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Straight-line distance in meters between two WGS84 coordinates. */
export function haversineDistanceMeters(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const deltaLat = toRadians(latitude2 - latitude1);
  const deltaLng = toRadians(longitude2 - longitude1);
  const lat1 = toRadians(latitude1);
  const lat2 = toRadians(latitude2);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(a));
}
