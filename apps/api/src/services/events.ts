import type { EventFilters, EventRecord } from "../models/domain.js";
import { events } from "./store.js";
import { saveRuntimeState } from "./runtimeState.js";
import { randomUUID } from "node:crypto";
import type { EventCategory } from "@social-outings/shared";

export function distanceBetweenKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }): number {
  const earthRadiusKm = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const latDistance = radians(second.latitude - first.latitude);
  const lonDistance = radians(second.longitude - first.longitude);
  const a = Math.sin(latDistance / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(lonDistance / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function listEvents(filters: EventFilters = {}): EventRecord[] {
  return events.filter((event) => event.publicationStatus !== "draft").filter((event) => {
    if (filters.category && event.category !== filters.category) return false;
    if (filters.location && !event.locationName.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.paid !== undefined && event.isPaidPromotion !== filters.paid) return false;
    return filters.distanceKm === undefined || filters.latitude === undefined || filters.longitude === undefined || distanceBetweenKm({ latitude: filters.latitude, longitude: filters.longitude }, event.coordinates) <= filters.distanceKm;
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
    coordinates: { latitude: input.latitude, longitude: input.longitude }, interests: [input.interest.trim().toLowerCase(), input.category],
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
  if (!event) return undefined;
  if (event.attendeeIds.includes(userId)) return { event, joined: false };
  event.attendeeIds.push(userId);
  event.attendeeCount += 1;
  saveRuntimeState();
  return { event, joined: true };
}
