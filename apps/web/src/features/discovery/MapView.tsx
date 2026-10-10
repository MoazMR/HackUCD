import { useMemo, useState } from "react";
import { PromotedBadge } from "../business/PromotedBadge";
import { EventTile } from "../events/EventTile";
import { AREAS, MAP_HEIGHT, MAP_PX_PER_KM, MAP_WIDTH, USER_ORIGIN, project } from "../events/geo";
import type { DiscoveryFilters, RankedEvent } from "../events/types";

type Props = {
  ranked: RankedEvent[];
  joined: ReadonlySet<string>;
  filters: DiscoveryFilters;
  onReset: () => void;
};

type Hotspot = { area: string; x: number; y: number; items: RankedEvent[] };

const pct = (value: number, total: number) => `${(value / total) * 100}%`;

/**
 * Illustrative map: a hand-drawn SVG (no tiles, no API keys) with real positions.
 * Hotspots are real <button>s so the map is fully keyboard + screen-reader usable,
 * and the same events are always listed below as the accessible alternative.
 */
export function MapView({ ranked, joined, filters, onReset }: Props) {
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  const hotspots = useMemo<Hotspot[]>(() => {
    return AREAS.map((area) => {
      const items = ranked.filter((item) => item.event.area === area.name);
      return { area: area.name, ...project(area.lat, area.lng), items };
    }).filter((spot) => spot.items.length > 0);
  }, [ranked]);

  const me = project(USER_ORIGIN.lat, USER_ORIGIN.lng);
  const selected = hotspots.find((spot) => spot.area === selectedArea) ?? null;

  return (
    <div className="tp-mapview">
      <div className="tp-mapwrap">
        <div className="tp-map" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
          <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="img" aria-label={`Illustrative map of your area with ${hotspots.length} event hotspots within ${filters.radiusKm} kilometres. The same events are listed below the map.`} preserveAspectRatio="xMidYMid slice">
            <rect width={MAP_WIDTH} height={MAP_HEIGHT} className="tp-map__land" />
            <path className="tp-map__sea" d={`M ${MAP_WIDTH * 0.8} 0 C ${MAP_WIDTH * 0.74} ${MAP_HEIGHT * 0.3}, ${MAP_WIDTH * 0.9} ${MAP_HEIGHT * 0.5}, ${MAP_WIDTH * 0.78} ${MAP_HEIGHT} L ${MAP_WIDTH} ${MAP_HEIGHT} L ${MAP_WIDTH} 0 Z`} />
            <path className="tp-map__river" d={`M 0 ${MAP_HEIGHT * 0.5} C ${MAP_WIDTH * 0.2} ${MAP_HEIGHT * 0.42}, ${MAP_WIDTH * 0.3} ${MAP_HEIGHT * 0.5}, ${MAP_WIDTH * 0.45} ${MAP_HEIGHT * 0.46} S ${MAP_WIDTH * 0.7} ${MAP_HEIGHT * 0.5}, ${MAP_WIDTH * 0.8} ${MAP_HEIGHT * 0.5}`} />
            <ellipse className="tp-map__park" cx={MAP_WIDTH * 0.57} cy={MAP_HEIGHT * 0.47} rx={MAP_WIDTH * 0.07} ry={MAP_HEIGHT * 0.05} />
            <ellipse className="tp-map__park" cx={MAP_WIDTH * 0.52} cy={MAP_HEIGHT * 0.74} rx={MAP_WIDTH * 0.09} ry={MAP_HEIGHT * 0.07} />
            <circle className="tp-map__radius" cx={me.x} cy={me.y} r={filters.radiusKm * MAP_PX_PER_KM} />
          </svg>

          <span className="tp-me" style={{ left: pct(me.x, MAP_WIDTH), top: pct(me.y, MAP_HEIGHT) }}>
            <span className="tp-me__dot" />
            <span className="tp-me__label">You (approx.)</span>
          </span>

          {hotspots.map((spot) => {
            const promoted = spot.items.find((item) => item.event.promotion)?.event.promotion;
            return (
            <button
              key={spot.area}
              type="button"
              className={`tp-hotspot${promoted ? " tp-hotspot--promoted" : ""}`}
              aria-pressed={selectedArea === spot.area}
              aria-label={`${spot.area}: ${spot.items.length} ${spot.items.length === 1 ? "event" : "events"}${promoted ? ", includes a promoted event" : ""}`}
              style={{ left: pct(spot.x, MAP_WIDTH), top: pct(spot.y, MAP_HEIGHT) }}
              onClick={() => setSelectedArea(selectedArea === spot.area ? null : spot.area)}
            >
              {promoted && <span className="tp-hotspot__promo" aria-hidden="true"><PromotedBadge variant="pin" sponsorName={promoted.sponsorName} /></span>}
              <span className="tp-hotspot__count">{spot.items.length}</span>
              <span className="tp-hotspot__name">{spot.area}</span>
            </button>
            );
          })}
        </div>
        <p className="tp-map__caption">Illustrative map · circle shows your {filters.radiusKm} km travel radius · only neighbourhoods are shown, never exact addresses.</p>
      </div>

      <aside className="tp-preview" aria-live="polite">
        {selected ? (
          <>
            <div className="tp-preview__head">
              <h3>{selected.area}</h3>
              <button type="button" className="tp-btn tp-btn--ghost tp-btn--sm" onClick={() => setSelectedArea(null)}>Close</button>
            </div>
            <ul className="tp-list tp-list--stack">
              {selected.items.map((item) => (
                <li key={item.event.id}><EventTile ranked={item} joined={joined.has(item.event.id)} compact /></li>
              ))}
            </ul>
          </>
        ) : (
          <div className="tp-preview__empty">
            <h3>{hotspots.length === 0 ? "No hotspots here yet" : "Pick a hotspot"}</h3>
            <p>
              {hotspots.length === 0
                ? "Nothing matches your search and filters inside this radius."
                : "Select a numbered marker to preview its events, or browse the full list below."}
            </p>
            {hotspots.length === 0 && <button type="button" className="tp-btn tp-btn--ghost" onClick={onReset}>Reset filters</button>}
          </div>
        )}
      </aside>

      <section className="tp-maplist" aria-labelledby="maplist-title">
        <h3 id="maplist-title">All events on the map <span className="tp-muted">(list view)</span></h3>
        {ranked.length === 0 ? (
          <p className="tp-muted">No events to list.</p>
        ) : (
          <ul className="tp-list">
            {ranked.map((item) => (
              <li key={item.event.id}><EventTile ranked={item} joined={joined.has(item.event.id)} /></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
