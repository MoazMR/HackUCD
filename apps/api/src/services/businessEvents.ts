import type { EventCategory, OutingEvent } from "@social-outings/shared";
import { getEvent, listEvents } from "./events.js";

/**
 * Venue-based events created by businesses. Kept in the business service so Moaz's core
 * event store is untouched. Shape is a superset of the shared OutingEvent, so the feed
 * can render these with the existing EventCard.
 *
 * All data here is synthetic and in memory: it resets when the API restarts.
 */
export type BusinessEvent = OutingEvent & {
  hostType: "business";
  businessName: string;
  venueAddressArea: string;
  createdAt: string;
};

export type HostedEvent = OutingEvent & { hostType?: "business" | "user"; businessName?: string };

export const EVENT_CATEGORIES: EventCategory[] = ["food", "sport", "music", "social", "other"];

/** Placeholder identity until the shared Event model gains a host/creator id. */
export const DEMO_USER = {
  id: "demo-user",
  name: "Aoife (demo user)",
  ownedEventIds: ["coffee-and-code"]
};

const businessEvents: BusinessEvent[] = [
  {
    id: "biz-padel-social-night",
    title: "Beginner padel social night",
    description: "Racquets provided. Mixed-level doubles, then food at the clubhouse.",
    startsAt: "2026-10-16T18:30:00.000Z",
    locationName: "Ranelagh Padel Club",
    category: "sport",
    attendeeCount: 6,
    hostType: "business",
    businessName: "Ranelagh Padel Club (synthetic)",
    venueAddressArea: "Ranelagh, Dublin 6",
    createdAt: "2026-10-09T09:00:00.000Z"
  }
];

export type BusinessEventInput = {
  businessName?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
  venueName?: unknown;
  venueAddressArea?: unknown;
  category?: unknown;
};

export type FieldErrors = Partial<Record<keyof BusinessEventInput, string>>;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateBusinessEvent(input: BusinessEventInput, now = new Date()): FieldErrors {
  const errors: FieldErrors = {};
  const businessName = text(input.businessName);
  const title = text(input.title);
  const description = text(input.description);
  const venueName = text(input.venueName);
  const area = text(input.venueAddressArea);
  const startsAt = text(input.startsAt);

  if (businessName.length < 2 || businessName.length > 80) errors.businessName = "Enter your business name (2–80 characters).";
  if (title.length < 3 || title.length > 80) errors.title = "Give the event a title (3–80 characters).";
  if (description.length > 500) errors.description = "Keep the description under 500 characters.";
  if (venueName.length < 2 || venueName.length > 80) errors.venueName = "Business events must happen at a named venue.";
  if (area.length < 2 || area.length > 80) errors.venueAddressArea = "Add the area, e.g. 'Ranelagh, Dublin 6'. Only the area is shown publicly.";
  if (!EVENT_CATEGORIES.includes(input.category as EventCategory)) errors.category = "Choose a category.";

  const start = new Date(startsAt);
  if (!startsAt || Number.isNaN(start.getTime())) errors.startsAt = "Choose a valid start date and time.";
  else if (start.getTime() <= now.getTime()) errors.startsAt = "The event must start in the future.";
  else if (start.getTime() - now.getTime() > 365 * 24 * 3600 * 1000) errors.startsAt = "Events can be scheduled up to a year ahead.";

  return errors;
}

export function createBusinessEvent(input: BusinessEventInput): BusinessEvent {
  const title = text(input.title);
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  const event: BusinessEvent = {
    id: `biz-${slug || "event"}-${Date.now().toString(36)}`,
    title,
    description: text(input.description),
    startsAt: new Date(text(input.startsAt)).toISOString(),
    locationName: text(input.venueName),
    category: input.category as EventCategory,
    attendeeCount: 0,
    hostType: "business",
    businessName: text(input.businessName),
    venueAddressArea: text(input.venueAddressArea),
    createdAt: new Date().toISOString()
  };
  businessEvents.unshift(event);
  return event;
}

export function listBusinessEvents(): BusinessEvent[] {
  return businessEvents;
}

/** Looks up an event in the business store first, then (read-only) in the core event service. */
export function findAnyEvent(id: string): HostedEvent | undefined {
  return businessEvents.find((event) => event.id === id) ?? getEvent(id);
}

export function listDemoUserEvents(): HostedEvent[] {
  return listEvents()
    .filter((event) => DEMO_USER.ownedEventIds.includes(event.id))
    .map((event) => ({ ...event, hostType: "user" as const }));
}
