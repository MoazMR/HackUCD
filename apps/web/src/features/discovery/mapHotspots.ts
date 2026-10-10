import { findArea, project } from "../events/geo";
import type { RankedEvent } from "../events/types";

export type Hotspot = { id: string; area: string; x: number; y: number; items: RankedEvent[] };

/** Build hotspots from the eligible catalogue, including neighbourhoods outside the
 * picker. Position always comes from the API's public approximate event point.
 * Different coarse points in an unknown neighbourhood remain separate hotspots.
 */
export function buildHotspots(ranked: RankedEvent[]): Hotspot[] {
  const groups = new Map<string, Hotspot>();
  for (const item of ranked) {
    const event = item.event;
    const area = findArea(event.area)?.name ?? event.area.trim();
    const id = `${area.toLowerCase()}:${event.lat}:${event.lng}`;
    const existing = groups.get(id);
    if (existing) existing.items.push(item);
    else groups.set(id, { id, area, ...project(event.lat, event.lng), items: [item] });
  }
  return [...groups.values()];
}

export type MarkerCluster = Hotspot & { areas: string[]; points: Array<{ area: string; x: number; y: number }> };

/** Merge markers whose pointer targets overlap at the rendered map size. The
 * original approximate points remain in the cluster; its pin is their centre.
 * Recheck after each merge because the new centre can meet another marker.
 */
export function clusterHotspots(hotspots: Hotspot[], renderedWidth: number, mapWidth: number): MarkerCluster[] {
  const scale = Math.max(renderedWidth, 1) / mapWidth;
  const clusters: MarkerCluster[] = hotspots.map((spot) => ({ ...spot, areas: [spot.area], points: [{ area: spot.area, x: spot.x, y: spot.y }] }));
  for (;;) {
    let pair: [number, number] | undefined;
    for (let first = 0; first < clusters.length && !pair; first += 1) {
      for (let second = first + 1; second < clusters.length; second += 1) {
        if (Math.abs(clusters[first].x - clusters[second].x) * scale < 56
          && Math.abs(clusters[first].y - clusters[second].y) * scale < 64) {
          pair = [first, second];
          break;
        }
      }
    }
    if (!pair) return clusters;
    const [first, second] = pair;
    const left = clusters[first];
    const right = clusters[second];
    const points = [...left.points, ...right.points];
    const areas = [...new Set([...left.areas, ...right.areas])];
    clusters[first] = {
      id: [left.id, right.id].sort().join("|"), area: areas.join(" / "), areas, points,
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      items: [...left.items, ...right.items]
    };
    clusters.splice(second, 1);
  }
}
