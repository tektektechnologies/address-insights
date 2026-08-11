import type {
  Amenity,
  AmenityCategory,
  InsightScores,
  UrbanLabel,
} from '@/src/types'

/** Walking only rewards places within a short stroll. */
export const WALKING_RADIUS_METERS = 1000

/** Driving uses the full amenity search envelope. */
export const DRIVING_RADIUS_METERS = 3500

/** Urban density is judged from a mid-range neighborhood window. */
export const URBAN_RADIUS_METERS = 1500

/**
 * Relative usefulness for a walkable errand / daily-life mix.
 * Grocery, pharmacy, transit, and parks matter more than entertainment.
 */
export const WALKING_CATEGORY_WEIGHTS: Record<AmenityCategory, number> = {
  grocery: 1.4,
  pharmacy: 1.3,
  transit: 1.3,
  park: 1.2,
  healthcare: 1.2,
  cafe: 1.1,
  restaurant: 1.0,
  fitness: 0.9,
  education: 0.8,
  entertainment: 0.7,
  other: 0.5,
}

/**
 * Caps stop one dense category (e.g. many restaurants) from owning the score.
 * Extra POIs beyond the cap are ignored for walking.
 */
export const WALKING_CATEGORY_CAPS: Record<AmenityCategory, number> = {
  restaurant: 6,
  cafe: 5,
  grocery: 5,
  pharmacy: 4,
  healthcare: 4,
  park: 4,
  fitness: 3,
  entertainment: 3,
  education: 4,
  transit: 5,
  other: 3,
}

/**
 * Raw walking points that map to 100.
 * Roughly: several useful categories, a few nearby places each, mid proximity.
 */
export const WALKING_REFERENCE_POINTS = 12

/** Amenity count inside the driving radius that maps to a full quantity score. */
export const DRIVING_QUANTITY_TARGET = 50

/** Blend for driving: mostly quantity, with a diversity bonus. */
export const DRIVING_QUANTITY_WEIGHT = 0.65
export const DRIVING_DIVERSITY_WEIGHT = 0.35

/** Nearby POI count inside the urban window that maps to a full density score. */
export const URBAN_COUNT_TARGET = 35

/** Blend for urban index: density first, diversity second. */
export const URBAN_COUNT_WEIGHT = 0.7
export const URBAN_DIVERSITY_WEIGHT = 0.3

/** Categories that represent meaningful neighborhood mix (excludes "other"). */
export const SCORED_CATEGORIES: AmenityCategory[] = [
  'restaurant',
  'cafe',
  'grocery',
  'pharmacy',
  'healthcare',
  'park',
  'fitness',
  'entertainment',
  'education',
  'transit',
]

export interface CategoryBreakdownItem {
  category: AmenityCategory
  count: number
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(100, Math.max(0, Math.round(value)))
}

function amenitiesWithinRadius(
  amenities: Amenity[],
  radiusMeters: number,
): Amenity[] {
  return amenities.filter(
    (amenity) =>
      Number.isFinite(amenity.distanceMeters) &&
      amenity.distanceMeters >= 0 &&
      amenity.distanceMeters <= radiusMeters,
  )
}

function uniqueScoredCategoryCount(amenities: Amenity[]): number {
  const categories = new Set<AmenityCategory>()

  for (const amenity of amenities) {
    if (amenity.category !== 'other') {
      categories.add(amenity.category)
    }
  }

  return categories.size
}

function diversityRatio(amenities: Amenity[]): number {
  return uniqueScoredCategoryCount(amenities) / SCORED_CATEGORIES.length
}

/**
 * Walking score: nearer POIs inside 1 km count more, useful categories weigh
 * a bit higher, and per-category caps keep restaurants from dominating.
 */
export function calculateWalkingScore(amenities: Amenity[]): number {
  const nearby = amenitiesWithinRadius(amenities, WALKING_RADIUS_METERS)
  const byCategory = new Map<AmenityCategory, Amenity[]>()

  for (const amenity of nearby) {
    const list = byCategory.get(amenity.category) ?? []
    list.push(amenity)
    byCategory.set(amenity.category, list)
  }

  let points = 0

  for (const category of Object.keys(
    WALKING_CATEGORY_WEIGHTS,
  ) as AmenityCategory[]) {
    const list = byCategory.get(category)
    if (!list || list.length === 0) {
      continue
    }

    // Prefer the closest places in the category when applying the cap.
    const selected = [...list]
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, WALKING_CATEGORY_CAPS[category])

    const weight = WALKING_CATEGORY_WEIGHTS[category]

    for (const amenity of selected) {
      // Linear proximity: 1 at the origin, 0 at the walking radius edge.
      const proximity = 1 - amenity.distanceMeters / WALKING_RADIUS_METERS
      points += Math.max(0, proximity) * weight
    }
  }

  return clampScore((points / WALKING_REFERENCE_POINTS) * 100)
}

/**
 * Driving score: rewards how many places fall inside 3.5 km and how many
 * useful categories appear. This is not travel-time or traffic modeling.
 */
export function calculateDrivingScore(amenities: Amenity[]): number {
  const nearby = amenitiesWithinRadius(amenities, DRIVING_RADIUS_METERS)
  const quantityScore = Math.min(
    100,
    (nearby.length / DRIVING_QUANTITY_TARGET) * 100,
  )
  const diversityScore = diversityRatio(nearby) * 100

  return clampScore(
    quantityScore * DRIVING_QUANTITY_WEIGHT +
      diversityScore * DRIVING_DIVERSITY_WEIGHT,
  )
}

/**
 * Urban index: local POI count (~1.5 km) plus category mix as a simple
 * density heuristic for labeling the neighborhood.
 */
export function calculateUrbanIndex(amenities: Amenity[]): number {
  const nearby = amenitiesWithinRadius(amenities, URBAN_RADIUS_METERS)
  const countScore = Math.min(100, (nearby.length / URBAN_COUNT_TARGET) * 100)
  const diversityScore = diversityRatio(nearby) * 100

  return clampScore(
    countScore * URBAN_COUNT_WEIGHT + diversityScore * URBAN_DIVERSITY_WEIGHT,
  )
}

export function urbanLabelFromIndex(urbanIndex: number): UrbanLabel {
  const score = clampScore(urbanIndex)

  if (score <= 29) {
    return 'Low Density'
  }

  if (score <= 54) {
    return 'Suburban'
  }

  if (score <= 79) {
    return 'Urban'
  }

  return 'Dense Urban'
}

/** Counts amenities in each category for UI breakdowns. */
export function getAmenityCategoryBreakdown(
  amenities: Amenity[],
): CategoryBreakdownItem[] {
  const counts: Record<AmenityCategory, number> = {
    restaurant: 0,
    cafe: 0,
    grocery: 0,
    pharmacy: 0,
    healthcare: 0,
    park: 0,
    fitness: 0,
    entertainment: 0,
    education: 0,
    transit: 0,
    other: 0,
  }

  for (const amenity of amenities) {
    counts[amenity.category] += 1
  }

  return (Object.keys(counts) as AmenityCategory[]).map((category) => ({
    category,
    count: counts[category],
  }))
}

export function calculateInsightScores(amenities: Amenity[]): InsightScores {
  const urbanIndex = calculateUrbanIndex(amenities)

  return {
    walking: calculateWalkingScore(amenities),
    driving: calculateDrivingScore(amenities),
    urbanIndex,
    urbanLabel: urbanLabelFromIndex(urbanIndex),
  }
}
