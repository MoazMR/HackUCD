import { AREAS, findArea } from "../events/geo";
import type { DiscoveryEvent } from "../events/types";
import type { Promotion } from "./types";

/**
 * Bridges paid promotions (GET /api/promotions) into the discovery feed's event list.
 *
 * - A promoted event that is already in the feed gets its `promotion` label attached.
 * - A promoted business venue event (not in the feed's sample data) is converted into a
 *   DiscoveryEvent, placed at its neighbourhood centre, and labelled.
 * - A promoted core event the feed doesn't know is skipped: there's no honest area,
 *   price or capacity to show for it until the feed reads /api/events.
 *
 * Fails soft: if the API is unreachable, the feed is returned unchanged.
 */
export async function withPromotions(events: DiscoveryEvent[]): Promise<DiscoveryEvent[]> {
  let promotions: Promotion[];
  try {
    const response = await fetch("/api/promotions");
    if (!response.ok) return events;
    promotions = ((await response.json()) as { promotions?: Promotion[] }).promotions ?? [];
  } catch {
    return events;
  }
  if (promotions.length === 0) return events;

  const byId = new Map(promotions.map((promotion) => [promotion.eventId, promotion]));
  const label = (promotion: Promotion) => ({ sponsorName: promotion.sponsorName, endsAt: promotion.endsAt, tier: promotion.tier });

  const labelled = events.map((event) => {
    const promotion = byId.get(event.id);
    return promotion ? { ...event, promotion: label(promotion) } : event;
  });

  const known = new Set(events.map((event) => event.id));
  const added = promotions
    .filter((promotion) => !known.has(promotion.eventId) && promotion.event.hostType === "business")
    .map((promotion) => fromBusinessEvent(promotion))
    .filter((event): event is DiscoveryEvent => event !== undefined);

  return [...added, ...labelled];
}

function matchArea(text: string | undefined) {
  if (!text) return undefined;
  return findArea(text) ?? AREAS.find((area) => text.toLowerCase().includes(area.name.toLowerCase()));
}

function fromBusinessEvent(promotion: Promotion): DiscoveryEvent | undefined {
  const event = promotion.event;
  const area = matchArea(event.venueAddressArea);
  if (!area) return undefined; // can't place it on the map without inventing a location
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    locationName: event.locationName,
    category: event.category,
    attendeeCount: event.attendeeCount,
    interest: event.interest ?? event.category,
    area: area.name,
    lat: area.lat,
    lng: area.lng,
    priceEur: event.priceEur ?? 0,
    capacity: event.capacity ?? Math.max(event.attendeeCount, 1),
    hostName: event.businessName ?? promotion.sponsorName,
    synthetic: false,
    promotion: { sponsorName: promotion.sponsorName, endsAt: promotion.endsAt, tier: promotion.tier }
  };
}
