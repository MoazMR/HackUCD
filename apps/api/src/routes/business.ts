import { Router } from "express";
import {
  createBusinessEvent,
  listBusinessEvents,
  listDemoUserEvents,
  validateBusinessEvent
} from "../services/businessEvents.js";
import { listActivePromotions, listOrders, PROMOTION_PLANS } from "../services/promotions.js";

export const businessRouter = Router();

/** Pricing: what each promotion buys, its price and currency. */
businessRouter.get("/plans", (_request, response) => {
  response.json({ plans: PROMOTION_PLANS });
});

businessRouter.get("/events", (_request, response) => {
  response.json({ events: listBusinessEvents() });
});

businessRouter.post("/events", (request, response) => {
  const errors = validateBusinessEvent(request.body ?? {});
  if (Object.keys(errors).length > 0) {
    return response.status(422).json({ error: "Please fix the highlighted fields.", fieldErrors: errors });
  }
  return response.status(201).json({ event: createBusinessEvent(request.body) });
});

/** Prototype identity matches ordinary-user event creation; production requires authentication. */
businessRouter.get("/my-events", (request, response) => {
  const userId = request.header("x-user-id")?.trim().slice(0, 80) || undefined;
  const promotedIds = new Set(listActivePromotions().map((promotion) => promotion.eventId));
  response.json({
    events: listDemoUserEvents(userId).map((event) => ({ ...event, promoted: promotedIds.has(event.id) }))
  });
});

/** Mock order log. Demo only: there is no auth yet, so every order is visible. */
businessRouter.get("/orders", (_request, response) => {
  response.json({ orders: listOrders() });
});
