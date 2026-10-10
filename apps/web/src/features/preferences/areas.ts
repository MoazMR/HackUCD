export type Area = { id: string; name: string; lat: number; lng: number };

/**
 * Approximate areas a person can show publicly. Centre points are rough
 * neighbourhood centres, used only to match "Use my location" to an area name.
 */
export const AREAS: Area[] = [
  { id: "city-centre", name: "Dublin city centre", lat: 53.347, lng: -6.26 },
  { id: "portobello", name: "Portobello", lat: 53.331, lng: -6.266 },
  { id: "rathmines", name: "Rathmines", lat: 53.322, lng: -6.265 },
  { id: "ranelagh", name: "Ranelagh", lat: 53.326, lng: -6.256 },
  { id: "ballsbridge", name: "Ballsbridge", lat: 53.329, lng: -6.231 },
  { id: "belfield", name: "Belfield", lat: 53.308, lng: -6.224 },
  { id: "dundrum", name: "Dundrum", lat: 53.289, lng: -6.243 },
  { id: "dun-laoghaire", name: "Dún Laoghaire", lat: 53.294, lng: -6.134 },
  { id: "stoneybatter", name: "Stoneybatter", lat: 53.352, lng: -6.285 },
  { id: "phibsborough", name: "Phibsborough", lat: 53.36, lng: -6.273 },
  { id: "drumcondra", name: "Drumcondra", lat: 53.37, lng: -6.255 },
  { id: "clontarf", name: "Clontarf", lat: 53.365, lng: -6.2 }
];

export const MIN_RADIUS_KM = 1;
export const MAX_RADIUS_KM = 25;

export function areaName(id: string): string {
  return AREAS.find((area) => area.id === id)?.name ?? "Area not set";
}

/** Nearest area to a coordinate. The coordinate itself must not be stored by callers. */
export function nearestArea(lat: number, lng: number): Area {
  let best = AREAS[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const area of AREAS) {
    const dLat = area.lat - lat;
    const dLng = (area.lng - lng) * Math.cos((lat * Math.PI) / 180);
    const distance = dLat * dLat + dLng * dLng;
    if (distance < bestDistance) { best = area; bestDistance = distance; }
  }
  return best;
}

export type LocateResult = { ok: true; areaId: string } | { ok: false; message: string };

/**
 * Asks the browser for a position, converts it to the nearest area name and
 * discards the coordinates. Only the area id leaves this function.
 */
export function locateApproximateArea(): Promise<LocateResult> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ ok: false, message: "This browser can't share a location. Pick your area from the list." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ ok: true, areaId: nearestArea(position.coords.latitude, position.coords.longitude).id }),
      () => resolve({ ok: false, message: "Location wasn't shared. Pick your area from the list instead." }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600000 }
    );
  });
}
