import { describe, expect, it } from "vitest";

import { haversineDistanceMeters } from "@/src/lib/haversine";

describe("haversineDistanceMeters", () => {
  it("returns approximately zero for the same point", () => {
    const distance = haversineDistanceMeters(40.7484, -73.9857, 40.7484, -73.9857);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThan(1e-6);
  });

  it("returns a reasonable positive distance for nearby coordinates", () => {
    // 0.01° longitude at the equator is about 1.11 km.
    const distance = haversineDistanceMeters(0, 0, 0, 0.01);
    expect(distance).toBeGreaterThan(1000);
    expect(distance).toBeLessThan(1200);
  });
});
