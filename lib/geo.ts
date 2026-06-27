import type { GeoPoint } from "./types";

export const COORDS: Record<string, { name: string; lat: number; lng: number }> = {
  US: { name: "United States", lat: 39.8, lng: -98.6 },
  DE: { name: "Germany", lat: 51.2, lng: 10.4 },
  CN: { name: "China", lat: 35.9, lng: 104.2 },
  AE: { name: "United Arab Emirates", lat: 23.4, lng: 53.8 },
  RU: { name: "Russia", lat: 61.5, lng: 105.3 },
  SG: { name: "Singapore", lat: 1.35, lng: 103.8 },
  SH: { name: "Shanghai", lat: 31.23, lng: 121.47 },
  AU: { name: "Australia", lat: -25.3, lng: 133.8 },
  IN: { name: "India", lat: 22.6, lng: 79.0 },
  TW: { name: "Taiwan", lat: 23.7, lng: 121.0 },
  GB: { name: "United Kingdom", lat: 54.0, lng: -2.0 },
};

// Regions under export-control / sanctions scrutiny.
export const HIGH_RISK_REGIONS = new Set(["RU", "IR", "KP", "SY"]);

export function point(code: string | undefined | null): GeoPoint | null {
  if (!code) return null;
  const c = COORDS[code];
  return c ? { code, name: c.name, lat: c.lat, lng: c.lng } : null;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

export function isHighRisk(code: string | undefined | null): boolean {
  return !!code && HIGH_RISK_REGIONS.has(code);
}
