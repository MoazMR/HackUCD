import { distanceKm, USER_ORIGIN } from "./geo";
import { formatKm } from "./format";
import {
  CATEGORY_LABELS,
  DATE_LABELS,
  TIME_LABELS,
  type DiscoveryEvent,
  type DiscoveryFilters,
  type RankedEvent
} from "./types";

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

const pad = (n: number) => String(n).padStart(2, "0");
/** Local calendar day as YYYY-MM-DD (not UTC, so "today" matches what the user sees). */
export const localDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export function matchesDate(iso: string, filters: DiscoveryFilters, now: Date): boolean {
  if (filters.date === "any") return true;
  const when = new Date(iso);
  switch (filters.date) {
    case "today":
      return localDay(when) === localDay(now);
    case "tomorrow": {
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      return localDay(when) === localDay(tomorrow);
    }
    case "weekend":
      return when.getDay() === 0 || when.getDay() === 6;
    case "custom":
      return filters.customDate === "" || localDay(when) === filters.customDate;
  }
}

export function matchesTimeOfDay(iso: string, timeOfDay: DiscoveryFilters["timeOfDay"]): boolean {
  if (timeOfDay === "any") return true;
  const hour = new Date(iso).getHours();
  if (timeOfDay === "morning") return hour >= 5 && hour < 12;
  if (timeOfDay === "afternoon") return hour >= 12 && hour < 17;
  return hour >= 17 || hour < 5; // evening, including late night
}

/** True when the user has asked for something specific, so interests are not required. */
export function isExplicitSearch(filters: DiscoveryFilters): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.category !== "all" ||
    filters.date !== "any" ||
    filters.timeOfDay !== "any" ||
    filters.area !== "any"
  );
}

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

/**
 * Transparent, rule-based recommendations (no hidden model):
 *  1. Drop events that already started, or fall outside the travel radius.
 *  2. Apply the explicit filters: category, date, time of day, area, free only.
 *  3. With NO explicit search (no keywords, type, date, time or area), keep only events
 *     matching the user's interests, so someone into poker/football/padel/tennis never
 *     sees knitting. Once the user searches or filters, interests are not required.
 *  4. Rank interest matches first, then paid promotions (labelled "Promoted"), then nearest,
 *     then soonest. Promotion changes position only: it never bypasses steps 1–3.
 */
export function rankEvents(
  events: DiscoveryEvent[],
  filters: DiscoveryFilters,
  now: Date = new Date()
): RankedEvent[] {
  const explicit = isExplicitSearch(filters);
  const interests = new Set(filters.interests);

  return events
    .filter((event) => new Date(event.startsAt).getTime() > now.getTime())
    .map((event) => ({ event, distanceKm: distanceKm(USER_ORIGIN, event) }))
    .filter(({ distanceKm: km }) => km <= filters.radiusKm)
    .filter(({ event }) => filters.category === "all" || event.category === filters.category)
    .filter(({ event }) => !filters.freeOnly || event.priceEur <= 0)
    .filter(({ event }) => filters.area === "any" || event.area === filters.area)
    .filter(({ event }) => matchesDate(event.startsAt, filters, now))
    .filter(({ event }) => matchesTimeOfDay(event.startsAt, filters.timeOfDay))
    .filter(({ event }) => !filters.query.trim() || matchesQuery(event, filters.query))
    .filter(({ event }) => explicit || interests.has(event.interest))
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
        Number(Boolean(b.event.promotion)) - Number(Boolean(a.event.promotion)) ||
        a.distanceKm - b.distanceKm ||
        a.event.startsAt.localeCompare(b.event.startsAt)
    )
    .map(({ event, distanceKm: km, reason }) => ({ event, distanceKm: km, reason }));
}
