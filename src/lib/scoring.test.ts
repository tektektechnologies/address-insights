import { describe, expect, it } from "vitest";

import {
  calculateDrivingScore,
  calculateInsightScores,
  calculateUrbanIndex,
  calculateWalkingScore,
  urbanLabelFromIndex,
} from "@/src/lib/scoring";
import type { Amenity, AmenityCategory } from "@/src/types";

function makeAmenity(
  overrides: Partial<Amenity> &
    Pick<Amenity, "category" | "distanceMeters">,
): Amenity {
  return {
    id: overrides.id ?? "amenity-1",
    name: overrides.name ?? "Test amenity",
    latitude: overrides.latitude ?? 40.75,
    longitude: overrides.longitude ?? -73.98,
    category: overrides.category,
    distanceMeters: overrides.distanceMeters,
  };
}

function expectValidScore(value: number): void {
  expect(Number.isFinite(value)).toBe(true);
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(100);
}

describe("scoring", () => {
  it("returns a walking score of 0 when there are no amenities", () => {
    expect(calculateWalkingScore([])).toBe(0);
  });

  it("never returns scores above 100", () => {
    const denseAmenities: Amenity[] = [];
    const categories: AmenityCategory[] = [
      "restaurant",
      "cafe",
      "grocery",
      "pharmacy",
      "healthcare",
      "park",
      "fitness",
      "entertainment",
      "education",
      "transit",
      "other",
    ];

    for (const category of categories) {
      for (let index = 0; index < 20; index += 1) {
        denseAmenities.push(
          makeAmenity({
            id: `${category}-${index}`,
            category,
            distanceMeters: 50 + index,
          }),
        );
      }
    }

    const scores = calculateInsightScores(denseAmenities);
    expectValidScore(scores.walking);
    expectValidScore(scores.driving);
    expectValidScore(scores.urbanIndex);
    expect(scores.walking).toBeLessThanOrEqual(100);
    expect(scores.driving).toBeLessThanOrEqual(100);
    expect(scores.urbanIndex).toBeLessThanOrEqual(100);
  });

  it("gives a higher walking score for closer useful amenities", () => {
    const closer = [
      makeAmenity({
        id: "grocery-near",
        category: "grocery",
        distanceMeters: 120,
      }),
      makeAmenity({
        id: "pharmacy-near",
        category: "pharmacy",
        distanceMeters: 180,
      }),
    ];
    const farther = [
      makeAmenity({
        id: "grocery-far",
        category: "grocery",
        distanceMeters: 900,
      }),
      makeAmenity({
        id: "pharmacy-far",
        category: "pharmacy",
        distanceMeters: 950,
      }),
    ];

    expect(calculateWalkingScore(closer)).toBeGreaterThan(
      calculateWalkingScore(farther),
    );
  });

  it("lets driving consider amenities beyond walking distance", () => {
    const beyondWalking = [
      makeAmenity({
        id: "grocery-drive",
        category: "grocery",
        distanceMeters: 2200,
      }),
      makeAmenity({
        id: "park-drive",
        category: "park",
        distanceMeters: 2500,
      }),
      makeAmenity({
        id: "transit-drive",
        category: "transit",
        distanceMeters: 2800,
      }),
    ];

    expect(calculateWalkingScore(beyondWalking)).toBe(0);
    expect(calculateDrivingScore(beyondWalking)).toBeGreaterThan(0);
  });

  it("classifies urban labels at the documented boundaries", () => {
    expect(urbanLabelFromIndex(0)).toBe("Low Density");
    expect(urbanLabelFromIndex(29)).toBe("Low Density");
    expect(urbanLabelFromIndex(30)).toBe("Suburban");
    expect(urbanLabelFromIndex(54)).toBe("Suburban");
    expect(urbanLabelFromIndex(55)).toBe("Urban");
    expect(urbanLabelFromIndex(79)).toBe("Urban");
    expect(urbanLabelFromIndex(80)).toBe("Dense Urban");
    expect(urbanLabelFromIndex(100)).toBe("Dense Urban");
  });

  it("produces representative urban index labels from fixtures", () => {
    const sparse = [
      makeAmenity({
        id: "sparse-1",
        category: "park",
        distanceMeters: 800,
      }),
    ];
    const dense: Amenity[] = [];
    const categories: AmenityCategory[] = [
      "restaurant",
      "cafe",
      "grocery",
      "pharmacy",
      "healthcare",
      "park",
      "fitness",
      "entertainment",
      "education",
      "transit",
    ];

    for (let index = 0; index < 40; index += 1) {
      dense.push(
        makeAmenity({
          id: `dense-${index}`,
          category: categories[index % categories.length],
          distanceMeters: 100 + index * 10,
        }),
      );
    }

    const sparseScores = calculateInsightScores(sparse);
    const denseScores = calculateInsightScores(dense);

    expect(sparseScores.urbanLabel).toBe("Low Density");
    expect(denseScores.urbanIndex).toBeGreaterThan(sparseScores.urbanIndex);
    expect(["Urban", "Dense Urban"]).toContain(denseScores.urbanLabel);
  });

  it("is deterministic for the same amenity input", () => {
    const amenities = [
      makeAmenity({
        id: "a",
        category: "cafe",
        distanceMeters: 250,
      }),
      makeAmenity({
        id: "b",
        category: "transit",
        distanceMeters: 400,
      }),
      makeAmenity({
        id: "c",
        category: "grocery",
        distanceMeters: 1600,
      }),
    ];

    expect(calculateInsightScores(amenities)).toEqual(
      calculateInsightScores(amenities),
    );
  });

  it("does not produce NaN scores for malformed distances", () => {
    const malformed = [
      makeAmenity({
        id: "nan",
        category: "grocery",
        distanceMeters: Number.NaN,
      }),
      makeAmenity({
        id: "infinity",
        category: "cafe",
        distanceMeters: Number.POSITIVE_INFINITY,
      }),
      makeAmenity({
        id: "negative",
        category: "pharmacy",
        distanceMeters: -50,
      }),
      makeAmenity({
        id: "valid",
        category: "park",
        distanceMeters: 300,
      }),
    ];

    const scores = calculateInsightScores(malformed);
    expectValidScore(scores.walking);
    expectValidScore(scores.driving);
    expectValidScore(scores.urbanIndex);
    expect(calculateUrbanIndex(malformed)).not.toBeNaN();
  });
});
