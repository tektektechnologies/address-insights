import { haversineDistanceMeters } from "@/src/lib/haversine";
import { OVERPASS_MAX_AMENITIES } from "@/src/lib/overpass/config";
import type { Amenity, AmenityCategory } from "@/src/types";

const FALLBACK_NAME_BY_CATEGORY: Record<AmenityCategory, string> = {
  restaurant: "Unnamed restaurant",
  cafe: "Unnamed cafe",
  grocery: "Unnamed grocery",
  pharmacy: "Unnamed pharmacy",
  healthcare: "Unnamed healthcare",
  park: "Unnamed park",
  fitness: "Unnamed fitness centre",
  entertainment: "Unnamed entertainment",
  education: "Unnamed school",
  transit: "Unnamed transit stop",
  other: "Unnamed place",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTags(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const tags: Record<string, string> = {};

  for (const [key, tagValue] of Object.entries(value)) {
    if (typeof tagValue === "string") {
      tags[key] = tagValue;
    }
  }

  return tags;
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

export function normalizeAmenityCategory(
  tags: Record<string, string>,
): AmenityCategory {
  const { amenity, shop, leisure, railway, public_transport: publicTransport } =
    tags;

  if (amenity === "restaurant" || amenity === "fast_food") {
    return "restaurant";
  }

  if (amenity === "cafe") {
    return "cafe";
  }

  if (shop === "supermarket" || shop === "convenience" || shop === "bakery") {
    return "grocery";
  }

  if (amenity === "pharmacy") {
    return "pharmacy";
  }

  if (
    amenity === "clinic" ||
    amenity === "doctors" ||
    amenity === "hospital"
  ) {
    return "healthcare";
  }

  if (leisure === "park" || leisure === "playground") {
    return "park";
  }

  if (leisure === "fitness_centre") {
    return "fitness";
  }

  if (amenity === "cinema" || amenity === "theatre") {
    return "entertainment";
  }

  if (
    amenity === "school" ||
    amenity === "college" ||
    amenity === "university"
  ) {
    return "education";
  }

  if (
    railway === "station" ||
    railway === "halt" ||
    railway === "tram_stop" ||
    publicTransport === "station"
  ) {
    return "transit";
  }

  return "other";
}

function resolveCoordinates(
  element: Record<string, unknown>,
): { latitude: number; longitude: number } | null {
  const type = element.type;

  if (type === "node") {
    const latitude = parseCoordinate(element.lat);
    const longitude = parseCoordinate(element.lon);
    if (latitude === null || longitude === null) {
      return null;
    }
    return { latitude, longitude };
  }

  if (type === "way" || type === "relation") {
    if (!isRecord(element.center)) {
      return null;
    }

    const latitude = parseCoordinate(element.center.lat);
    const longitude = parseCoordinate(element.center.lon);
    if (latitude === null || longitude === null) {
      return null;
    }

    return { latitude, longitude };
  }

  return null;
}

function toAmenity(
  element: unknown,
  originLatitude: number,
  originLongitude: number,
): Amenity | null {
  if (!isRecord(element)) {
    return null;
  }

  if (typeof element.type !== "string" || element.id === undefined) {
    return null;
  }

  const coordinates = resolveCoordinates(element);
  if (!coordinates) {
    return null;
  }

  if (
    coordinates.latitude < -90 ||
    coordinates.latitude > 90 ||
    coordinates.longitude < -180 ||
    coordinates.longitude > 180
  ) {
    return null;
  }

  const tags = readTags(element.tags);
  const category = normalizeAmenityCategory(tags);
  const named = typeof tags.name === "string" ? tags.name.trim() : "";
  const name = named || FALLBACK_NAME_BY_CATEGORY[category];
  const id = `${element.type}/${String(element.id)}`;

  return {
    id,
    name,
    category,
    latitude: coordinates.latitude,
    longitude: coordinates.longitude,
    distanceMeters: haversineDistanceMeters(
      originLatitude,
      originLongitude,
      coordinates.latitude,
      coordinates.longitude,
    ),
  };
}

/** Parse Overpass JSON into normalized, deduplicated, nearest-first amenities. */
export function normalizeOverpassAmenities(
  data: unknown,
  originLatitude: number,
  originLongitude: number,
): Amenity[] {
  if (!isRecord(data) || !Array.isArray(data.elements)) {
    return [];
  }

  const byId = new Map<string, Amenity>();

  for (const element of data.elements) {
    const amenity = toAmenity(element, originLatitude, originLongitude);
    if (!amenity) {
      continue;
    }

    const existing = byId.get(amenity.id);
    if (!existing || amenity.distanceMeters < existing.distanceMeters) {
      byId.set(amenity.id, amenity);
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, OVERPASS_MAX_AMENITIES);
}
