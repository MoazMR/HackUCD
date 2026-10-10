import { distanceKm, USER_ORIGIN } from "./geo";
import { formatKm } from "./format";
import type { DiscoveryEvent, DiscoveryFilters, RankedEvent } from "./types";

function matchesQuery(event: DiscoveryEvent, query: string): boolean {
  const haystack = [event.title, event.description, event.category, event.interest, event.area, event.locationName]
    .join(" ")
    .toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

/**
 * Transparent, rule-based recommendations (no hidden model):
 *  1. Drop events that already started, or fall outside the travel radius.
 *  2. Apply explicit filters (category, free only).
 *  3. With NO search text, keep only events matching the user's interests, so
 *     someone into poker/football/padel/tennis never sees knitting.
 *     With search text the user is asking explicitly, so interests are not required.
 *  4. Rank interest matches first, then nearest, then soonest.
 */
export function rankEvents(
  events: DiscoveryEvent[],
  filters: DiscoveryFilters,
  now: Date = new Date()
): RankedEvent[] {
  const searching = filters.query.trim().length > 0;
  const interests = new Set(filters.interests);

  return events
    .filter((event) => new Date(event.startsAt).getTime() > now.getTime())
    .map((event) => ({ event, distanceKm: distanceKm(USER_ORIGIN, event) }))
    .filter(({ distanceKm: km }) => km <= filters.radiusKm)
    .filter(({ event }) => filters.category === "all" || event.category === filters.category)
    .filter(({ event }) => !filters.freeOnly || event.priceEur <= 0)
    .filter(({ event }) => (searching ? matchesQuery(event, filters.query) : interests.has(event.interest)))
    .map(({ event, distanceKm: km }) => {
      const interestMatch = interests.has(event.interest);
      const reason = interestMatch
        ? `Matches ${event.interest} · ${formatKm(km)} away`
        : `${formatKm(km)} away`;
      return { event, distanceKm: km, reason, interestMatch };
    })
    .sort(
      (a, b) =>
        Number(b.interestMatch) - Number(a.interestMatch) ||
        a.distanceKm - b.distanceKm ||
        a.event.startsAt.localeCompare(b.event.startsAt)
    )
    .map(({ event, distanceKm: km, reason }) => ({ event, distanceKm: km, reason }));
}
