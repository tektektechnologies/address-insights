import {
  OVERPASS_QUERY_TIMEOUT_SECONDS,
  OVERPASS_SEARCH_RADIUS_METERS,
} from "@/src/lib/overpass/config";

/**
 * Build a bounded Overpass QL query.
 * Callers must pass already-validated finite lat/lng within geographic bounds.
 * Only numeric literals from those values are interpolated into the query.
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
    `nwr["amenity"="restaurant"](${around})`,
    `nwr["amenity"="fast_food"](${around})`,
    `nwr["amenity"="cafe"](${around})`,
    `nwr["shop"="supermarket"](${around})`,
    `nwr["shop"="convenience"](${around})`,
    `nwr["shop"="bakery"](${around})`,
    `nwr["amenity"="pharmacy"](${around})`,
    `nwr["amenity"="clinic"](${around})`,
    `nwr["amenity"="doctors"](${around})`,
    `nwr["amenity"="hospital"](${around})`,
    `nwr["leisure"="park"](${around})`,
    `nwr["leisure"="playground"](${around})`,
    `nwr["leisure"="fitness_centre"](${around})`,
    `nwr["amenity"="cinema"](${around})`,
    `nwr["amenity"="theatre"](${around})`,
    `nwr["amenity"="school"](${around})`,
    `nwr["amenity"="college"](${around})`,
    `nwr["amenity"="university"](${around})`,
    `nwr["railway"="station"](${around})`,
    `nwr["railway"="halt"](${around})`,
    `nwr["railway"="tram_stop"](${around})`,
    `nwr["public_transport"="station"](${around})`,
  ];

  return `
[out:json][timeout:${OVERPASS_QUERY_TIMEOUT_SECONDS}];
(
  ${selectors.join(";\n  ")};
);
out center;
`.trim();
}
