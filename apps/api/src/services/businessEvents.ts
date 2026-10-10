import type { EventCategory, OutingEvent } from "@social-outings/shared";
import type { EventRecord } from "../models/domain.js";
import { createEvent, getEvent, listAllEvents, listEventsOwnedBy } from "./events.js";

/**
 * Business drafts share the persistent event catalogue with ordinary-user events.
 * A verified sandbox payment publishes the draft; unpaid drafts stay private to the portal.
 */
export type BusinessEvent = OutingEvent & {
  hostType: "business";
  businessName: string;
  /** Public neighbourhood name, e.g. "Ranelagh". The portal offers the feed's area list. */
  venueAddressArea: string;
  /** Single interest the event is about, e.g. "poker"; used by the feed's interest matching. */
  interest?: string;
  priceEur: number;
  capacity: number;
  createdAt: string;
  publicationStatus: "draft" | "published";
  isPaidPromotion: boolean;
};

export type HostedEvent = OutingEvent & {
  hostType?: "business" | "user";
  hostId?: string;
  hostName?: string;
  businessName?: string;
  venueAddressArea?: string;
  interest?: string;
  priceEur?: number;
  capacity?: number;
  isPaidPromotion?: boolean;
  publicationStatus?: "draft" | "published";
  /** Core events only: the API's interest tags (public). */
  interests?: string[];
};

export const EVENT_CATEGORIES: EventCategory[] = ["food", "sport", "music", "social", "other"];

/** Default identity for the unauthenticated prototype. */
export const DEMO_USER = {
  id: "demo-user",
  name: "Dara L. (demo user)"
};

export type BusinessEventInput = {
  businessName?: unknown;
  title?: unknown;
  description?: unknown;
  startsAt?: unknown;
  venueName?: unknown;
  venueAddressArea?: unknown;
  category?: unknown;
  interest?: unknown;
  priceEur?: unknown;
  capacity?: unknown;
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
  if (input.interest !== undefined && (text(input.interest).length < 2 || text(input.interest).length > 30)) errors.interest = "Choose an interest.";
  if (input.priceEur !== undefined && !(typeof input.priceEur === "number" && input.priceEur >= 0 && input.priceEur <= 500)) errors.priceEur = "Price must be between €0 and €500.";
  if (input.capacity !== undefined && !(Number.isInteger(input.capacity) && (input.capacity as number) >= 2 && (input.capacity as number) <= 500)) errors.capacity = "Capacity must be a whole number from 2 to 500.";

  const start = new Date(startsAt);
  if (!startsAt || Number.isNaN(start.getTime())) errors.startsAt = "Choose a valid start date and time.";
  else if (start.getTime() <= now.getTime()) errors.startsAt = "The event must start in the future.";
  else if (start.getTime() - now.getTime() > 365 * 24 * 3600 * 1000) errors.startsAt = "Events can be scheduled up to a year ahead.";

  return errors;
}

export function createBusinessEvent(input: BusinessEventInput): BusinessEvent {
  const businessName = text(input.businessName);
  const area = text(input.venueAddressArea);
  const coordinates = approximateAreaCoordinates(area);
  return toBusinessEvent(createEvent({
    title: text(input.title), description: text(input.description), startsAt: text(input.startsAt), locationName: text(input.venueName),
    category: input.category as EventCategory, interest: input.interest === undefined ? input.category as string : text(input.interest), area,
    latitude: coordinates.latitude, longitude: coordinates.longitude, priceEur: typeof input.priceEur === "number" ? input.priceEur : 0,
    capacity: typeof input.capacity === "number" ? input.capacity : 30, hostId: `business:${businessName.toLowerCase()}`,
    hostName: businessName, hostType: "business", businessName, publicationStatus: "draft"
  }));
}

export function listBusinessEvents(): BusinessEvent[] {
  return listAllEvents().filter((event) => event.hostType === "business").map(toBusinessEvent);
}

function approximateAreaCoordinates(area: string): { latitude: number; longitude: number } {
  const known: Record<string, [number, number]> = {
    ranelagh: [53.3267, -6.2567], docklands: [53.3467, -6.2382], smithfield: [53.3487, -6.2789],
    portobello: [53.3364, -6.2683], ballsbridge: [53.3280, -6.2306], drumcondra: [53.3700, -6.2548]
  };
  const match = Object.entries(known).find(([name]) => area.toLowerCase().includes(name));
  return { latitude: match?.[1][0] ?? 53.3498, longitude: match?.[1][1] ?? -6.2603 };
}

function toBusinessEvent(event: EventRecord): BusinessEvent {
  return {
    id: event.id, title: event.title, description: event.description, startsAt: event.startsAt, locationName: event.locationName,
    category: event.category, attendeeCount: event.attendeeCount, hostType: "business", businessName: event.businessName ?? event.hostName,
    venueAddressArea: event.area, interest: event.interests[0], priceEur: event.priceEur, capacity: event.capacity, createdAt: event.createdAt,
    publicationStatus: event.publicationStatus ?? "published", isPaidPromotion: event.isPaidPromotion
  };
}

/**
 * Public-safe copy of a core event: only the shared OutingEvent fields. Drops attendeeIds,
 * exact coordinates and other API-internal fields before anything is returned by business routes.
 */
function toPublicEvent(event: EventRecord): HostedEvent {
  const { id, title, description, startsAt, locationName, category, attendeeCount, interests, hostType, hostName, businessName, area, priceEur, capacity, isPaidPromotion, publicationStatus } = event;
  return { id, title, description, startsAt, locationName, category, attendeeCount, interests, hostType, hostName, businessName, venueAddressArea: area, interest: interests[0], priceEur, capacity, isPaidPromotion, publicationStatus };
}

/** Public-safe snapshot from the shared event catalogue. */
export function findAnyEvent(id: string): HostedEvent | undefined {
  const core = getEvent(id);
  return core && toPublicEvent(core);
}

export function listDemoUserEvents(userId = DEMO_USER.id): HostedEvent[] {
  return listEventsOwnedBy(userId).map(toPublicEvent);
}
