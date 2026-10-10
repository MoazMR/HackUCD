import { EventTile } from "../events/EventTile";
import type { DiscoveryFilters, RankedEvent } from "../events/types";

type Props = {
  ranked: RankedEvent[];
  joined: ReadonlySet<string>;
  filters: DiscoveryFilters;
  onReset: () => void;
};

export function ForYouView({ ranked, joined, filters, onReset }: Props) {
  const searching = filters.query.trim().length > 0;

  if (ranked.length === 0) {
    return (
      <div className="tp-state">
        <h3>{searching ? `Nothing matches “${filters.query.trim()}”` : "No events match your interests yet"}</h3>
        <p>
          {searching
            ? "Try a different word, a wider radius, or clear your filters."
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
        {searching
          ? `${ranked.length} ${ranked.length === 1 ? "result" : "results"} for “${filters.query.trim()}”`
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
