import type { DiscoveryEvent } from "../events/types";
import type { Promotion } from "./types";

/** Attach sponsored labels to the supplied catalogue; a payment snapshot never adds
 * an event missing from public discovery. The public paid flag preserves disclosure
 * when richer promotion metadata is temporarily unavailable.
 */
export async function withPromotions(events: DiscoveryEvent[]): Promise<DiscoveryEvent[]> {
  let promotions: Promotion[] = [];
  try {
    const response = await fetch("/api/promotions");
    if (response.ok) promotions = ((await response.json()) as { promotions?: Promotion[] }).promotions ?? [];
  } catch {
    // The public paid flag still supports a truthful generic sponsored label.
  }
  const byId = new Map(promotions.map((promotion) => [promotion.eventId, promotion]));
  return events.map((event) => {
    const promotion = byId.get(event.id);
    if (event.isPaidPromotion === false) return { ...event, promotion: undefined };
    if (promotion) return { ...event, promotion: { sponsorName: promotion.sponsorName, endsAt: promotion.endsAt, tier: promotion.tier } };
    if (event.isPaidPromotion) return { ...event, promotion: { sponsorName: "", tier: event.hostType ?? "user" } };
    return event;
  });
}
