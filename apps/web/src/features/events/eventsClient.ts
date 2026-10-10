import type { EventMembership, PublicEventRecord } from "@social-outings/shared";
import { withPromotions } from "../business/promotedFeed";
import { findArea } from "./geo";
import type { DiscoveryEvent, NewEventDraft } from "./types";

const viewerHeaders = { "x-user-id": "demo-user" };

/** Public catalogue plus this demo viewer's own memberships; no browser-only events. */
export async function loadEvents(): Promise<DiscoveryEvent[]> {
  const simulate = new URLSearchParams(window.location.search).get("state");
  if (simulate === "error") throw new Error("Simulated failure");
  if (simulate === "empty") return [];
  const [catalogueResponse, membershipsResponse] = await Promise.all([
    fetch("/api/events"), fetch("/api/events/mine", { headers: viewerHeaders })
  ]);
  if (!catalogueResponse.ok || !membershipsResponse.ok) throw new Error("Events unavailable. Try again.");
  const catalogue = await catalogueResponse.json() as { events: PublicEventRecord[] };
  const mine = await membershipsResponse.json() as { memberships: EventMembership[] };
  const memberships = new Map(mine.memberships.map((item) => [item.event.id, item.role]));
  return withPromotions(catalogue.events.map((event) => fromApiEvent(event, memberships.get(event.id))));
}

export function fromApiEvent(event: PublicEventRecord, role?: EventMembership["role"]): DiscoveryEvent {
  return {
    id: event.id, title: event.title, description: event.description, startsAt: event.startsAt, locationName: event.locationName,
    category: event.category, attendeeCount: event.attendeeCount, interest: event.interests[0] ?? event.category,
    interests: event.interests, area: event.area, lat: event.coordinates.latitude, lng: event.coordinates.longitude,
    priceEur: event.priceEur, capacity: event.capacity, hostName: event.hostName, hostType: event.hostType,
    isPaidPromotion: event.isPaidPromotion, hosting: role === "hosting", joinedByViewer: Boolean(role), synthetic: false
  };
}

export async function publishEvent(draft: NewEventDraft): Promise<DiscoveryEvent> {
  const area = findArea(draft.area);
  const response = await fetch("/api/events", {
    method: "POST", headers: { "Content-Type": "application/json", ...viewerHeaders },
    body: JSON.stringify({ ...draft, startsAt: new Date(draft.startsAt).toISOString(), latitude: area?.lat ?? 53.3498, longitude: area?.lng ?? -6.2603, hostName: "Dara L. (demo user)" })
  });
  const body = await response.json().catch(() => ({})) as { event?: PublicEventRecord; error?: string };
  if (!response.ok || !body.event) throw new Error(body.error ?? "Could not publish the event.");
  return fromApiEvent(body.event, "hosting");
}

export async function updateAttendance(eventId: string, join: boolean): Promise<DiscoveryEvent> {
  const response = await fetch(`/api/events/${encodeURIComponent(eventId)}/attendance`, {
    method: join ? "POST" : "DELETE", headers: { "Content-Type": "application/json", ...viewerHeaders },
    ...(join ? { body: JSON.stringify({ userId: "demo-user" }) } : {})
  });
  const body = await response.json().catch(() => ({})) as { event?: PublicEventRecord; error?: string };
  if (!response.ok || !body.event) throw new Error(body.error ?? "Could not update attendance. Try again.");
  return fromApiEvent(body.event, join ? "going" : undefined);
}

export function trackEvent(eventId: string, action: "impression" | "detail_view" | "directions"): void {
  void fetch(`/api/analytics/events/${encodeURIComponent(eventId)}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
  }).catch(() => undefined);
}
