/** Approximate neighbourhood centres. Only areas are ever shown, never exact addresses. */
export type Area = { name: string; lat: number; lng: number };

export const AREAS: Area[] = [
  { name: "Belfield", lat: 53.3067, lng: -6.2233 },
  { name: "Donnybrook", lat: 53.322, lng: -6.232 },
  { name: "Ranelagh", lat: 53.3262, lng: -6.2562 },
  { name: "Sandyford", lat: 53.2776, lng: -6.22 },
  { name: "Smithfield", lat: 53.3498, lng: -6.2778 },
  { name: "Phibsborough", lat: 53.359, lng: -6.274 },
  { name: "Howth", lat: 53.389, lng: -6.07 }
];

/**
 * The user's *approximate* location (deliberately offset ~1 km from the area centre, as a
 * privacy-preserving coarse location would be). Synthetic: a real build would ask permission.
 */
export const USER_ORIGIN = { name: "Belfield", lat: 53.3125, lng: -6.2395 };

/**
 * Points discovery at the approximate area chosen in the profile. Still area-level only:
 * callers pass a neighbourhood centre, never a device position.
 */
export function setUserOrigin(area: { name: string; lat: number; lng: number }): void {
  USER_ORIGIN.name = area.name;
  USER_ORIGIN.lat = area.lat;
  USER_ORIGIN.lng = area.lng;
}

export function findArea(name: string): Area | undefined {
  return AREAS.find((area) => area.name === name);
}

const EARTH_RADIUS_KM = 6371;
const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/* ---- Illustrative map projection (no tiles, no third-party map keys) ---- */
export const MAP_BOUNDS = { north: 53.42, south: 53.25, west: -6.4, east: -6.04 };
const KM_PER_DEG_LAT = 111.2;
const KM_PER_DEG_LNG = 66.7;
export const MAP_PX_PER_KM = 40;
export const MAP_WIDTH = (MAP_BOUNDS.east - MAP_BOUNDS.west) * KM_PER_DEG_LNG * MAP_PX_PER_KM;
export const MAP_HEIGHT = (MAP_BOUNDS.north - MAP_BOUNDS.south) * KM_PER_DEG_LAT * MAP_PX_PER_KM;

export function project(lat: number, lng: number): { x: number; y: number } {
  return {
    x: (lng - MAP_BOUNDS.west) * KM_PER_DEG_LNG * MAP_PX_PER_KM,
    y: (MAP_BOUNDS.north - lat) * KM_PER_DEG_LAT * MAP_PX_PER_KM
  };
}
