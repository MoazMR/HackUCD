import { USER_ORIGIN } from "./geo";
import { rankEligibleEvents, matchesDiscoveryFilters, isExplicitSearch } from "@social-outings/shared/src/recommendations.mjs";
export { localDay, matchesDate, matchesTimeOfDay, isExplicitSearch } from "@social-outings/shared/src/recommendations.mjs";
import {
  CATEGORY_LABELS,
  DATE_LABELS,
  TIME_LABELS,
  type DiscoveryEvent,
  type DiscoveryFilters,
  type RankedEvent
} from "./types";

/** Short labels for the active explicit filters, e.g. ["Music", "Tomorrow", "Evening"]. */
export function describeActiveFilters(filters: DiscoveryFilters): string[] {
  const labels: string[] = [];
  if (filters.query.trim()) labels.push(`“${filters.query.trim()}”`);
  if (filters.category !== "all") labels.push(CATEGORY_LABELS[filters.category]);
  if (filters.date === "custom") {
    if (filters.customDate) labels.push(filters.customDate);
  } else if (filters.date !== "any") labels.push(DATE_LABELS[filters.date]);
  if (filters.timeOfDay !== "any") labels.push(TIME_LABELS[filters.timeOfDay]);
  if (filters.area !== "any") labels.push(filters.area);
  if (filters.freeOnly) labels.push("Free");
  return labels;
}

/** Eligibility and scoring use the exact same shared contract as the API. */
export function rankEvents(events: DiscoveryEvent[], filters: DiscoveryFilters, now: Date = new Date(), origin = USER_ORIGIN): RankedEvent[] {
  const candidates = events.map((event) => ({
    ...event, coordinates: { latitude: event.lat, longitude: event.lng },
    interests: event.interests ?? [event.interest], isPaidPromotion: event.isPaidPromotion ?? Boolean(event.promotion)
  })).filter((event) => matchesDiscoveryFilters(event, filters, now));
  return rankEligibleEvents(candidates, {
    approximateLocation: { latitude: origin.lat, longitude: origin.lng },
    travelRadiusKm: filters.radiusKm, interests: filters.interests
  }, { includeUnrelated: isExplicitSearch(filters), now: now.getTime() }).map((item) => ({
    event: item.event, distanceKm: item.distanceKm, reason: item.explanation,
    score: item.score, scoreBreakdown: item.scoreBreakdown
  }));
}
