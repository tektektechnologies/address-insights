export type AmenityCategory =
  | "restaurant"
  | "cafe"
  | "grocery"
  | "pharmacy"
  | "healthcare"
  | "park"
  | "fitness"
  | "entertainment"
  | "education"
  | "transit"
  | "other";

export type UrbanLabel =
  | "Low Density"
  | "Suburban"
  | "Urban"
  | "Dense Urban";

export interface LocationResult {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
}

export interface Amenity {
  id: string;
  name: string;
  category: AmenityCategory;
  latitude: number;
  longitude: number;
  distanceMeters: number;
}

export interface InsightScores {
  walking: number;
  driving: number;
  urbanIndex: number;
  urbanLabel: UrbanLabel;
}

export interface SearchHistoryEntry {
  displayName: string;
  latitude: number;
  longitude: number;
  searchedAt: string;
}
