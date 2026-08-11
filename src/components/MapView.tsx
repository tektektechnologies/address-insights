"use client";

import {
  Component,
  useEffect,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import type { Map as LeafletMap } from "leaflet";

import { formatAmenityCategory, formatDistance } from "@/src/lib/format";
import {
  MAP_DEFAULT_ZOOM,
  MAP_MAX_AMENITY_MARKERS,
  OSM_TILE_ATTRIBUTION,
  OSM_TILE_URL,
} from "@/src/lib/map-config";
import type { Amenity } from "@/src/types";

import "leaflet/dist/leaflet.css";

type MapViewProps = {
  latitude: number;
  longitude: number;
  address: string;
  amenities: Amenity[];
};

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function MapFallback({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex h-72 max-w-full items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--canvas)] px-4 text-center text-sm leading-relaxed text-[var(--ink-muted)] sm:h-96"
    >
      <p>
        <span className="font-semibold text-[var(--ink)]">Map unavailable. </span>
        {message}
      </p>
    </div>
  );
}

class MapErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("MapView failed:", error.message, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <MapFallback message="The map could not be displayed for this location." />
      );
    }

    return this.props.children;
  }
}

function MapCanvas({ latitude, longitude, address, amenities }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function initializeMap() {
      const container = containerRef.current;
      if (!container || mapRef.current) {
        return;
      }

      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default;

        if (cancelled || !containerRef.current || mapRef.current) {
          return;
        }

        const map = L.map(containerRef.current, {
          scrollWheelZoom: false,
        });
        mapRef.current = map;

        L.tileLayer(OSM_TILE_URL, {
          attribution: OSM_TILE_ATTRIBUTION,
          maxZoom: 19,
        }).addTo(map);

        const bounds = L.latLngBounds([]);
        const origin = L.latLng(latitude, longitude);
        bounds.extend(origin);

        L.circleMarker(origin, {
          radius: 11,
          color: "#0b5f59",
          weight: 2,
          fillColor: "#0f766e",
          fillOpacity: 0.95,
        })
          .addTo(map)
          .bindPopup(
            `<strong>${escapeHtml(address)}</strong><br /><span>Searched address</span>`,
          );

        const markers = [...amenities]
          .filter(
            (amenity) =>
              Number.isFinite(amenity.latitude) &&
              Number.isFinite(amenity.longitude),
          )
          .sort((a, b) => a.distanceMeters - b.distanceMeters)
          .slice(0, MAP_MAX_AMENITY_MARKERS);

        for (const amenity of markers) {
          const point = L.latLng(amenity.latitude, amenity.longitude);
          bounds.extend(point);

          L.circleMarker(point, {
            radius: 6,
            color: "#3f5250",
            weight: 1,
            fillColor: "#6b7f7c",
            fillOpacity: 0.85,
          })
            .addTo(map)
            .bindPopup(
              `<strong>${escapeHtml(amenity.name)}</strong><br />${escapeHtml(
                formatAmenityCategory(amenity.category),
              )}<br />${escapeHtml(formatDistance(amenity.distanceMeters))}`,
            );
        }

        if (bounds.isValid()) {
          if (markers.length === 0) {
            map.setView(origin, MAP_DEFAULT_ZOOM);
          } else {
            map.fitBounds(bounds, {
              padding: [36, 36],
              maxZoom: 16,
            });
          }
        } else {
          map.setView(origin, MAP_DEFAULT_ZOOM);
        }

        // Ensure tiles/layout calculate correctly after the container is painted.
        requestAnimationFrame(() => {
          map.invalidateSize();
        });
      } catch {
        if (!cancelled) {
          setErrorMessage("The map could not be displayed for this location.");
        }

        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      }
    }

    void initializeMap();

    return () => {
      cancelled = true;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [address, amenities, latitude, longitude]);

  if (errorMessage) {
    return <MapFallback message={errorMessage} />;
  }

  return (
    <div
      ref={containerRef}
      className="h-72 w-full max-w-full overflow-hidden rounded-2xl border border-[var(--line)] sm:h-96 [&_.leaflet-container]:z-0 [&_.leaflet-container]:h-full [&_.leaflet-container]:w-full [&_.leaflet-container]:rounded-2xl [&_.leaflet-control-attribution]:text-[10px] sm:[&_.leaflet-control-attribution]:text-xs"
      role="region"
      aria-label={`Map of amenities near ${address}`}
    />
  );
}

export function MapView(props: MapViewProps) {
  return (
    <MapErrorBoundary>
      <MapCanvas {...props} />
    </MapErrorBoundary>
  );
}
