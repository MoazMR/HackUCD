import type { EventFilters, EventRecord } from "../models/domain.js";
import { events } from "./store.js";
import { saveRuntimeState } from "./runtimeState.js";
import { randomUUID } from "node:crypto";
import type { EventCategory, PublicEventRecord } from "@social-outings/shared";
export { distanceBetweenKm } from "@social-outings/shared/src/recommendations.mjs";
import { distanceBetweenKm } from "@social-outings/shared/src/recommendations.mjs";

const neighbourhoods: Record<string, [number, number]> = {
  belfield: [53.308, -6.224], donnybrook: [53.322, -6.232], ranelagh: [53.326, -6.256],
  rathmines: [53.322, -6.265], portobello: [53.331, -6.266], ballsbridge: [53.329, -6.231],
  "city centre": [53.347, -6.26], smithfield: [53.3498, -6.2778], stoneybatter: [53.352, -6.285],
  phibsborough: [53.36, -6.273], drumcondra: [53.37, -6.255], clontarf: [53.365, -6.2],
  dundrum: [53.289, -6.243], sandyford: [53.2776, -6.22], "dún laoghaire": [53.294, -6.134],
  howth: [53.389, -6.07], docklands: [53.3467, -6.2382]
};

/** Controlled neighbourhood labels for profile preferences, never arbitrary addresses. */
export function coordinatesForArea(area: string): { latitude: number; longitude: number } | undefined {
  const name = area.trim().toLowerCase();
  const coordinates = neighbourhoods[name === "dublin city centre" ? "city centre" : name];
  return coordinates ? { latitude: coordinates[0], longitude: coordinates[1] } : undefined;
}

/** A named neighbourhood centre or a coarse ~1 km grid; never a supplied precise point. */
export function approximateCoordinates(area: string, coordinates: { latitude: number; longitude: number }) {
  const known = Object.entries(neighbourhoods).find(([name]) => area.toLowerCase().includes(name));
  return known ? coordinatesForArea(known[0])!
    : { latitude: Math.round(coordinates.latitude * 100) / 100, longitude: Math.round(coordinates.longitude * 100) / 100 };
}

/** Use an allowlist so new internal fields cannot accidentally enter API responses. */
export function toPublicEvent(event: EventRecord): PublicEventRecord {
  return {
    id: event.id, title: event.title, description: event.description, startsAt: event.startsAt,
    locationName: event.locationName, category: event.category, attendeeCount: event.attendeeCount,
    coordinates: approximateCoordinates(event.area, event.coordinates), interests: [...event.interests],
    isPaidPromotion: event.isPaidPromotion, hostType: event.hostType, hostName: event.hostName,
    ...(event.businessName ? { businessName: event.businessName } : {}), area: event.area,
    priceEur: event.priceEur, capacity: event.capacity, createdAt: event.createdAt,
    publicationStatus: event.publicationStatus
  };
}

export function listEvents(filters: EventFilters = {}): EventRecord[] {
  return events.filter((event) => event.publicationStatus !== "draft").filter((event) => {
    if (filters.category && event.category !== filters.category) return false;
    if (filters.location && !event.locationName.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.paid !== undefined && event.isPaidPromotion !== filters.paid) return false;
    return filters.distanceKm === undefined || filters.latitude === undefined || filters.longitude === undefined || distanceBetweenKm({ latitude: filters.latitude, longitude: filters.longitude }, approximateCoordinates(event.area, event.coordinates)) <= filters.distanceKm;
  });
}

export function listAllEvents(): EventRecord[] {
  return events;
}

export function getEvent(id: string): EventRecord | undefined {
  return events.find((event) => event.id === id);
}

export type CreateEventInput = {
  title: string; description?: string; startsAt: string; locationName: string; category: EventCategory;
  interest: string; area: string; latitude: number; longitude: number; priceEur?: number; capacity?: number;
  hostId: string; hostName: string; hostType?: "user" | "business"; businessName?: string; publicationStatus?: "draft" | "published";
};

export function createEvent(input: CreateEventInput): EventRecord {
  const event: EventRecord = {
    id: `evt_${randomUUID().slice(0, 10)}`,
    title: input.title.trim(), description: input.description?.trim() ?? "", startsAt: new Date(input.startsAt).toISOString(),
    locationName: input.locationName.trim(), category: input.category, attendeeCount: input.hostType === "business" ? 0 : 1,
    coordinates: approximateCoordinates(input.area, { latitude: input.latitude, longitude: input.longitude }), interests: [...new Set([input.interest.trim().toLowerCase(), input.category])],
    isPaidPromotion: false, attendeeIds: input.hostType === "business" ? [] : [input.hostId], hostId: input.hostId,
    hostType: input.hostType ?? "user", hostName: input.hostName.trim(), businessName: input.businessName?.trim(), area: input.area.trim(),
    priceEur: Math.round((input.priceEur ?? 0) * 100) / 100, capacity: input.capacity ?? 20, createdAt: new Date().toISOString(),
    publicationStatus: input.publicationStatus ?? "published"
  };
  events.unshift(event);
  saveRuntimeState();
  return event;
}

export function listEventsOwnedBy(hostId: string): EventRecord[] {
  return events.filter((event) => event.hostId === hostId);
}

export function joinEvent(eventId: string, userId: string): { event: EventRecord; joined: boolean } | undefined {
  const event = getEvent(eventId);
  if (!event || event.publicationStatus === "draft") return undefined;
  if (event.attendeeIds.includes(userId)) return { event, joined: false };
  event.attendeeIds.push(userId);
  event.attendeeCount += 1;
  saveRuntimeState();
  return { event, joined: true };
}

export function listEventMemberships(userId: string) {
  return listEvents().filter((event) => event.hostId === userId || event.attendeeIds.includes(userId))
    .map((event) => ({ event: toPublicEvent(event), role: event.hostId === userId ? "hosting" as const : "going" as const }));
}

export function leaveEvent(eventId: string, userId: string): { event: EventRecord; left: boolean } | undefined {
  const event = getEvent(eventId);
  if (!event || event.publicationStatus === "draft") return undefined;
  if (event.hostId === userId || !event.attendeeIds.includes(userId)) return { event, left: false };
  event.attendeeIds = event.attendeeIds.filter((id) => id !== userId);
  event.attendeeCount = Math.max(0, event.attendeeCount - 1);
  saveRuntimeState();
  return { event, left: true };
}
