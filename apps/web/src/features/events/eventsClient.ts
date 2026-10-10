import { withPromotions } from "../business/promotedFeed";
import { buildSyntheticEvents } from "./syntheticData";
import { findArea } from "./geo";
import type { DiscoveryEvent, NewEventDraft } from "./types";

/**
 * Single seam for event data. Today it returns clearly-labelled synthetic events
 * because GET /api/events (contract v0) has no coordinates, interests, price or
 * capacity yet. When the API grows those fields, swap the body for a `fetch("/api/events")`
 * and keep the signature.
 *
 * Demo helper: append `?state=error` or `?state=empty` to the URL to preview the
 * error and empty states.
 */
export async function loadEvents(): Promise<DiscoveryEvent[]> {
  const simulate = new URLSearchParams(window.location.search).get("state");
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (simulate === "error") throw new Error("Simulated failure");
  if (simulate === "empty") return [];
  try {
    const response = await fetch("/api/events");
    if (!response.ok) throw new Error("events unavailable");
    const body = await response.json() as { events?: ApiEvent[] };
    const byId = new Map(buildSyntheticEvents().map((event) => [event.id, event]));
    for (const event of body.events ?? []) byId.set(event.id, fromApiEvent(event));
    return withPromotions([...byId.values()]);
  } catch {
    return withPromotions(buildSyntheticEvents());
  }
}

type ApiEvent = {
  id: string; title: string; description: string; startsAt: string; locationName: string; category: DiscoveryEvent["category"];
  attendeeCount: number; coordinates: { latitude: number; longitude: number }; interests: string[]; isPaidPromotion: boolean;
  area: string; priceEur: number; capacity: number; hostName: string;
};

function fromApiEvent(event: ApiEvent): DiscoveryEvent {
  return {
    id: event.id, title: event.title, description: event.description, startsAt: event.startsAt, locationName: event.locationName,
    category: event.category, attendeeCount: event.attendeeCount, interest: event.interests[0] ?? event.category, area: event.area,
    lat: event.coordinates.latitude, lng: event.coordinates.longitude, priceEur: event.priceEur, capacity: event.capacity,
    hostName: event.hostName, synthetic: false
  };
}

export async function publishEvent(draft: NewEventDraft): Promise<DiscoveryEvent> {
  const area = findArea(draft.area);
  const response = await fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": "demo-user" },
    body: JSON.stringify({ ...draft, latitude: area?.lat ?? 53.3498, longitude: area?.lng ?? -6.2603, hostName: "Dara L. (demo user)" })
  });
  const body = await response.json().catch(() => ({})) as { event?: ApiEvent; error?: string };
  if (!response.ok || !body.event) throw new Error(body.error ?? "Could not publish the event.");
  return fromApiEvent(body.event);
}

export function trackEvent(eventId: string, action: "impression" | "detail_view" | "directions"): void {
  void fetch(`/api/analytics/events/${encodeURIComponent(eventId)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
  }).catch(() => undefined);
}
