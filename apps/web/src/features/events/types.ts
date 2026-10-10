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
  /** All public interest tags, used by the shared API/browser ranking contract. */
  interests?: string[];
  isPaidPromotion?: boolean;
  hostType?: "user" | "business";
  /** Viewer-specific membership from /api/events/mine, never another person’s identity. */
  hosting?: boolean;
  joinedByViewer?: boolean;
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
  /** Set when someone paid to promote this event (see features/business). Always shown as "Promoted". */
  promotion?: { sponsorName: string; endsAt?: string; tier: "business" | "user" };
};

export type ChatMessage = {
  id: string;
  author: string;
  text: string;
  sentAt: string;
  mine: boolean;
};

export type CategoryFilter = "all" | DiscoveryEvent["category"];
export type DateFilter = "any" | "today" | "tomorrow" | "weekend" | "custom";
export type TimeFilter = "any" | "morning" | "afternoon" | "evening";

export type DiscoveryFilters = {
  /** Keyword search over title, description, category, interest and area. */
  query: string;
  category: CategoryFilter;
  date: DateFilter;
  /** Local calendar day as YYYY-MM-DD; only used when `date` is "custom". */
  customDate: string;
  timeOfDay: TimeFilter;
  /** "any" or a neighbourhood name from AREAS. */
  area: string;
  freeOnly: boolean;
  radiusKm: number;
  interests: string[];
};

export type RankedEvent = {
  event: DiscoveryEvent;
  distanceKm: number;
  /** Human-readable explanation, e.g. "Matches football · 2.1 km away". */
  reason: string;
  score: number;
  scoreBreakdown: { interest: number; category: number; distance: number; sponsored: number };
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
  "padel",
  "tennis",
  "run clubs",
  "hikes",
  "sea swims",
  "cycling",
  "climbing",
  "yoga",
  "sauna",
  "poker",
  "board games",
  "pub quiz",
  "books",
  "knitting",
  "coding meetups",
  "live music",
  "trad sessions",
  "dance classes",
  "cooking classes",
  "coffee",
  "food markets",
  "arts and crafts",
  "film nights"
] as const;

export const CATEGORY_LABELS: Record<DiscoveryEvent["category"], string> = {
  food: "Food",
  sport: "Sport",
  music: "Music",
  social: "Social",
  other: "Other"
};

export const DATE_LABELS: Record<DateFilter, string> = {
  any: "Any date",
  today: "Today",
  tomorrow: "Tomorrow",
  weekend: "This weekend",
  custom: "Pick a date"
};

export const TIME_LABELS: Record<TimeFilter, string> = {
  any: "Any time",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening"
};

export const RADIUS_OPTIONS_KM = [2, 5, 10, 15, 25] as const;
export const DEFAULT_INTERESTS = ["football", "poker", "padel", "tennis"];
export const DEFAULT_RADIUS_KM = 10;
