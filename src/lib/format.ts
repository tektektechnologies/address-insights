import type { AmenityCategory } from "@/src/types";

const CATEGORY_LABELS: Record<AmenityCategory, string> = {
  restaurant: "Restaurant",
  cafe: "Cafe",
  grocery: "Grocery",
  pharmacy: "Pharmacy",
  healthcare: "Healthcare",
  park: "Park",
  fitness: "Fitness",
  entertainment: "Entertainment",
  education: "Education",
  transit: "Transit",
  other: "Other",
};

export function formatAmenityCategory(category: AmenityCategory): string {
  return CATEGORY_LABELS[category];
}

export function formatDistance(distanceMeters: number): string {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return "—";
  }

  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }

  const kilometers = distanceMeters / 1000;
  const rounded =
    kilometers >= 10 ? Math.round(kilometers) : Math.round(kilometers * 10) / 10;

  return `${rounded} km`;
}
