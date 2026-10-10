import "./promoted.css";

/**
 * Honest label for paid placements. Use on every promoted event in the For You feed
 * and on Map hotspots, e.g.
 *   const { byEventId } = usePromotions();
 *   {byEventId.get(event.id) && <PromotedBadge sponsorName={byEventId.get(event.id)!.sponsorName} />}
 */
export function PromotedBadge({ sponsorName, variant = "card" }: { sponsorName?: string; variant?: "card" | "pin" }) {
  const description = sponsorName ? `Paid promotion by ${sponsorName}` : "Paid promotion";
  return (
    <span className={`tp-promoted tp-promoted--${variant}`} title={description}>
      Promoted
      <span className="tp-visually-hidden">: {description}</span>
    </span>
  );
}
