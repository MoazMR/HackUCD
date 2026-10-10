import type { EventFilters, EventRecord } from "../models/domain.js";
import { events } from "./store.js";

export function distanceBetweenKm(first: { latitude: number; longitude: number }, second: { latitude: number; longitude: number }): number {
  const earthRadiusKm = 6371;
  const radians = (value: number) => value * Math.PI / 180;
  const latDistance = radians(second.latitude - first.latitude);
  const lonDistance = radians(second.longitude - first.longitude);
  const a = Math.sin(latDistance / 2) ** 2 + Math.cos(radians(first.latitude)) * Math.cos(radians(second.latitude)) * Math.sin(lonDistance / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function listEvents(filters: EventFilters = {}): EventRecord[] {
  return events.filter((event) => {
    if (filters.category && event.category !== filters.category) return false;
    if (filters.location && !event.locationName.toLowerCase().includes(filters.location.toLowerCase())) return false;
    if (filters.paid !== undefined && event.isPaidPromotion !== filters.paid) return false;
    return filters.distanceKm === undefined || filters.latitude === undefined || filters.longitude === undefined || distanceBetweenKm({ latitude: filters.latitude, longitude: filters.longitude }, event.coordinates) <= filters.distanceKm;
  });
}

export function getEvent(id: string): EventRecord | undefined {
  return events.find((event) => event.id === id);
}

export function joinEvent(eventId: string, userId: string): { event: EventRecord; joined: boolean } | undefined {
  const event = getEvent(eventId);
  if (!event) return undefined;
  if (event.attendeeIds.includes(userId)) return { event, joined: false };
  event.attendeeIds.push(userId);
  event.attendeeCount += 1;
  return { event, joined: true };
}
