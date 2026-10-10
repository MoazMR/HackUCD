import { Router } from "express";
import { listActivePromotions } from "../services/promotions.js";

/**
 * Read-only feed/map integration point. The feed and map use this to label paid
 * placements as "Promoted"; it does not change Moaz's core /api/events responses.
 *
 * Promotion changes position, not audience: callers should still apply the user's
 * interest and radius filters before boosting a promoted event.
 */
export const promotionsRouter = Router();

promotionsRouter.get("/", (_request, response) => {
  response.json({
    promotions: listActivePromotions().map(({ id, eventId, tier, label, sponsorName, startsAt, endsAt, event }) => ({
      id,
      eventId,
      tier,
      label,
      sponsorName,
      startsAt,
      endsAt,
      event
    }))
  });
});
