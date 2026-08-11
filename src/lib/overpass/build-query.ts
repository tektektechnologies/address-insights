import {
  OVERPASS_QUERY_TIMEOUT_SECONDS,
  OVERPASS_SEARCH_RADIUS_METERS,
} from "@/src/lib/overpass/config";

/**
 * Build a bounded Overpass QL query.
 * Callers must pass already-validated finite lat/lng within geographic bounds.
 * Only numeric literals from those values are interpolated into the query.
 *
 * Uses compact regex tag filters so the public Overpass instances do less work
 * than dozens of separate selectors.
 */
export function buildAmenitiesOverpassQuery(
  latitude: number,
  longitude: number,
): string {
  const lat = latitude.toFixed(7);
  const lng = longitude.toFixed(7);
  const radius = OVERPASS_SEARCH_RADIUS_METERS;
  const around = `around:${radius},${lat},${lng}`;

  const selectors = [
    `nwr["amenity"~"^(restaurant|fast_food|cafe|pharmacy|clinic|doctors|hospital|cinema|theatre|school|college|university)$"](${around})`,
    `nwr["shop"~"^(supermarket|convenience|bakery)$"](${around})`,
    `nwr["leisure"~"^(park|playground|fitness_centre)$"](${around})`,
    `nwr["railway"~"^(station|halt|tram_stop)$"](${around})`,
    `nwr["public_transport"="station"](${around})`,
  ];

  // Overpass unions require a ';' after every statement, including the last.
  return `[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];(${selectors.join(";")};);out center;`;
}
