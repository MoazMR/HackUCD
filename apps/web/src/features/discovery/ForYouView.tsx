import { EventTile } from "../events/EventTile";
import { describeActiveFilters, isExplicitSearch } from "../events/recommend";
import type { DiscoveryFilters, RankedEvent } from "../events/types";

type Props = {
  ranked: RankedEvent[];
  joined: ReadonlySet<string>;
  filters: DiscoveryFilters;
  onReset: () => void;
};

export function ForYouView({ ranked, joined, filters, onReset }: Props) {
  const explicit = isExplicitSearch(filters);

  if (ranked.length === 0) {
    return (
      <div className="tp-state">
        <h3>{explicit ? "No events match your search" : "No events match your interests yet"}</h3>
        <p>
          {explicit
            ? "Try different keywords, a wider radius or date, or clear your filters."
            : filters.interests.length === 0
              ? "Pick a few interests above and we'll find events for you."
              : "Try a wider radius, add another interest, or create the first one nearby."}
        </p>
        <div className="tp-state__actions">
          <button type="button" className="tp-btn tp-btn--ghost" onClick={onReset}>Reset filters</button>
          <a className="tp-btn tp-btn--primary" href="#/create">Create an event</a>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="tp-results" role="status">
        {explicit
          ? `${ranked.length} ${ranked.length === 1 ? "result" : "results"} · ${describeActiveFilters(filters).join(" · ")}`
          : `${ranked.length} ${ranked.length === 1 ? "event" : "events"} picked for ${filters.interests.join(", ")}`}
      </p>
      <ul className="tp-list">
        {ranked.map((item) => (
          <li key={item.event.id}>
            <EventTile ranked={item} joined={joined.has(item.event.id)} />
          </li>
        ))}
      </ul>
    </>
  );
}
