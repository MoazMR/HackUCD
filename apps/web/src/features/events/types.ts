import type { OutingEvent } from "@social-outings/shared";

/**
 * The shared `OutingEvent` contract is intentionally left untouched (it is owned by
 * the API owners). The discovery experience needs a few extra display-only fields,
 * so we extend it locally. Nothing here contains private user information: hosts are
 * shown by first name + initial only, and locations are neighbourhood-level areas.
 */
export type DiscoveryEvent = OutingEvent & {
  /** The single interest this event is about, e.g. "football". Used for recommendations. */
  interest: string;
  /** Neighbourhood, e.g. "Ranelagh". Public and approximate. */
  area: string;
  lat: number;
  lng: number;
  priceEur: number;
  capacity: number;
  /** First name + initial only, e.g. "Aoife K.". */
  hostName: string;
  /** True for data generated in the browser rather than served by the API. */
  synthetic: boolean;
};

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  sentAt: string;
  mine: boolean;
};

export type CategoryFilter = "all" | DiscoveryEvent["category"];

export type DiscoveryFilters = {
  query: string;
  category: CategoryFilter;
  freeOnly: boolean;
  radiusKm: number;
  interests: string[];
};

export type RankedEvent = {
  event: DiscoveryEvent;
  distanceKm: number;
  /** Human-readable explanation, e.g. "Matches football · 2.1 km away". */
  reason: string;
};

export type NewEventDraft = {
  title: string;
  description: string;
  category: DiscoveryEvent["category"];
  interest: string;
  area: string;
  locationName: string;
  startsAt: string;
  capacity: number;
  priceEur: number;
};

export const INTERESTS = [
  "football",
  "poker",
  "padel",
  "tennis",
  "board games",
  "live music",
  "knitting",
  "books"
] as const;

export const CATEGORY_LABELS: Record<DiscoveryEvent["category"], string> = {
  food: "Food",
  sport: "Sport",
  music: "Music",
  social: "Social",
  other: "Other"
};

export const RADIUS_OPTIONS_KM = [2, 5, 10, 15, 25] as const;
export const DEFAULT_INTERESTS = ["football", "poker", "padel", "tennis"];
export const DEFAULT_RADIUS_KM = 10;
