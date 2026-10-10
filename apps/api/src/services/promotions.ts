import { randomUUID } from "node:crypto";
import { DEMO_USER, findAnyEvent, type HostedEvent } from "./businessEvents.js";
import { getEvent, listAllEvents } from "./events.js";
import { saveRuntimeState, storedCollection } from "./runtimeState.js";

/**
 * Promotion plans, mock orders and active promotions.
 * Prices live only on the server: the client sends a plan id, never an amount.
 * Orders and promotions use the prototype's durable JSON boundary (or explicit disposable mode).
 */

export type BuyerType = "business" | "user";

export type PromotionPlan = {
  id: "venue-boost-7d" | "community-boost-3d";
  name: string;
  buyerType: BuyerType;
  amountCents: number;
  currency: "eur";
  durationDays: number;
  billing: "one-time";
  summary: string;
  includes: string[];
};

export const PROMOTION_PLANS: PromotionPlan[] = [
  {
    id: "venue-boost-7d",
    name: "Venue Boost",
    buyerType: "business",
    amountCents: 1499,
    currency: "eur",
    durationDays: 7,
    billing: "one-time",
    summary: "Publish a venue event and put it in front of nearby matching customers.",
    includes: [
      "Publishes your venue event and places it higher in For You for nearby matching interests",
      "Highlighted hotspot on the Map",
      "Clearly labelled “Promoted” with your business name",
      "Runs 7 days, or until the event starts if that is sooner"
    ]
  },
  {
    id: "community-boost-3d",
    name: "Community Boost",
    buyerType: "user",
    amountCents: 299,
    currency: "eur",
    durationDays: 3,
    billing: "one-time",
    summary: "Optional for people hosting their own event.",
    includes: [
      "Moves your event higher in For You for nearby people with matching interests",
      "Labelled “Promoted” so everyone knows it is a paid placement",
      "Runs 3 days, or until the event starts if that is sooner"
    ]
  }
];

export type OrderStatus = "pending" | "paid" | "cancelled" | "expired" | "failed";

export type Buyer = { type: BuyerType; id: string; name: string };

export type MockOrder = {
  id: string;
  planId: PromotionPlan["id"];
  eventId: string;
  eventTitle: string;
  buyer: Buyer;
  amountCents: number;
  currency: "eur";
  status: OrderStatus;
  stripeCheckoutSessionId?: string;
  checkoutExpiresAt?: string;
  confirmedVia?: "webhook" | "success-return";
  createdAt: string;
  paidAt?: string;
  closedAt?: string;
};

export type Promotion = {
  id: string;
  orderId: string;
  eventId: string;
  planId: PromotionPlan["id"];
  tier: BuyerType;
  label: "Promoted";
  sponsorName: string;
  startsAt: string;
  endsAt: string;
  event: HostedEvent;
};

const orders: MockOrder[] = storedCollection("orders", []);
const promotions: Promotion[] = storedCollection("promotions", []);

export class PromotionError extends Error {
  constructor(message: string, readonly status = 400, readonly code = "invalid_request") {
    super(message);
  }
}

export function getPlan(planId: unknown): PromotionPlan | undefined {
  return PROMOTION_PLANS.find((plan) => plan.id === planId);
}

export function isActive(promotion: Promotion, now = new Date()): boolean {
  return new Date(promotion.startsAt) <= now && now < new Date(promotion.endsAt);
}

/**
 * A matching paid order and active promotion are authoritative for every sponsored flag.
 * This also removes unsupported legacy seed flags when the API restarts.
 */
function syncCorePaidFlag(eventId: string, now = new Date()) {
  const core = getEvent(eventId);
  if (!core) return;
  const active = promotions.some((promotion) => promotion.eventId === eventId && isPurchased(promotion) && isActive(promotion, now));
  if (core.isPaidPromotion !== active) {
    core.isPaidPromotion = active;
    saveRuntimeState();
  }
}

/** Clears flags for promotions that have ended. Called on reads and by the expiry timer. */
export function syncExpiredPaidFlags(now = new Date()) {
  for (const event of listAllEvents()) syncCorePaidFlag(event.id, now);
}

export function listActivePromotions(now = new Date()): Promotion[] {
  syncExpiredPaidFlags(now);
  return promotions.filter((promotion) => isPurchased(promotion) && isActive(promotion, now)).map(toPublicPromotion);
}

/** Never trust a persisted snapshot as a response shape, including pre-migration handoff data. */
export function toPublicPromotion(promotion: Promotion): Promotion {
  const source = findAnyEvent(promotion.eventId) ?? promotion.event;
  const {
    id, title, description, startsAt, locationName, category, attendeeCount, interests,
    hostType, hostName, businessName, venueAddressArea, interest, priceEur, capacity,
    isPaidPromotion, publicationStatus
  } = source;
  return {
    id: promotion.id, orderId: promotion.orderId, eventId: promotion.eventId, planId: promotion.planId,
    tier: promotion.tier, label: "Promoted", sponsorName: promotion.sponsorName,
    startsAt: promotion.startsAt, endsAt: promotion.endsAt,
    event: { id, title, description, startsAt, locationName, category, attendeeCount, interests,
      hostType, hostName, businessName, venueAddressArea, interest, priceEur, capacity,
      isPaidPromotion, publicationStatus }
  };
}

function isPurchased(promotion: Promotion): boolean {
  return findOrder(promotion.orderId)?.status === "paid";
}

export function listOrders(): MockOrder[] {
  return [...orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function findOrder(id: string): MockOrder | undefined {
  return orders.find((order) => order.id === id);
}

export function findOrderBySession(sessionId: string): MockOrder | undefined {
  return orders.find((order) => order.stripeCheckoutSessionId === sessionId);
}

export function findPendingOrderForEvent(eventId: string): MockOrder | undefined {
  return orders.find((order) => order.eventId === eventId && order.status === "pending");
}

export function promotionForOrder(orderId: string): Promotion | undefined {
  return promotions.find((promotion) => promotion.orderId === orderId);
}

function parseBuyer(raw: unknown, userId: string): Buyer {
  const buyer = (raw ?? {}) as Record<string, unknown>;
  if (buyer.type === "user") return { type: "user", id: userId, name: DEMO_USER.name };
  if (buyer.type === "business") {
    const name = typeof buyer.name === "string" ? buyer.name.trim() : "";
    if (name.length < 2 || name.length > 80) throw new PromotionError("Business name is required (2–80 characters).");
    return { type: "business", id: `business:${name.toLowerCase()}`, name };
  }
  throw new PromotionError("buyer.type must be 'business' or 'user'.");
}

/** Validates a promotion request and records a pending mock order. No money moves here. */
export function createPendingOrder(input: { planId?: unknown; eventId?: unknown; buyer?: unknown }, now = new Date(), userId = DEMO_USER.id) {
  const plan = getPlan(input.planId);
  if (!plan) throw new PromotionError("Unknown promotion plan.", 400, "unknown_plan");
  const buyer = parseBuyer(input.buyer, userId);
  if (plan.buyerType !== buyer.type) {
    throw new PromotionError(`${plan.name} is for ${plan.buyerType === "business" ? "businesses" : "individual hosts"}.`, 400, "plan_buyer_mismatch");
  }

  const eventId = typeof input.eventId === "string" ? input.eventId : "";
  const event = findAnyEvent(eventId);
  const core = getEvent(eventId);
  if (!event || !core) throw new PromotionError("Event not found.", 404, "event_not_found");

  if (buyer.type === "user" && (core.hostType !== "user" || core.hostId !== buyer.id)) {
    throw new PromotionError("You can only promote an event you created.", 403, "not_event_host");
  }
  if (buyer.type === "business" && (core.hostType !== "business" || core.hostId !== buyer.id)) {
    throw new PromotionError("Businesses can only promote their own venue events.", 403, "not_event_host");
  }
  if (buyer.type === "user") buyer.name = core.hostName;
  if (new Date(event.startsAt) <= now) {
    throw new PromotionError("This event has already started, so it can no longer be promoted.", 409, "event_started");
  }
  if (promotions.some((promotion) => promotion.eventId === event.id && isPurchased(promotion) && isActive(promotion, now))) {
    throw new PromotionError("This event is already promoted.", 409, "already_promoted");
  }
  if (findPendingOrderForEvent(event.id)) {
    throw new PromotionError("This event already has a pending checkout. Complete or cancel it before trying again.", 409, "checkout_pending");
  }

  const order: MockOrder = {
    id: `ord_${randomUUID().slice(0, 8)}`,
    planId: plan.id,
    eventId: event.id,
    eventTitle: event.title,
    buyer,
    amountCents: plan.amountCents,
    currency: plan.currency,
    status: "pending",
    createdAt: now.toISOString(),
    checkoutExpiresAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString()
  };
  orders.push(order);
  saveRuntimeState();
  return { order, plan, event };
}

export function attachCheckoutSession(orderId: string, sessionId: string, expiresAt?: number) {
  const order = findOrder(orderId);
  if (order) {
    if (order.status !== "pending") throw new PromotionError("This checkout order is already closed.", 409, "order_closed");
    if (order.stripeCheckoutSessionId && order.stripeCheckoutSessionId !== sessionId) {
      throw new PromotionError("Checkout session does not belong to this order.", 409, "session_mismatch");
    }
    order.stripeCheckoutSessionId = sessionId;
    if (expiresAt !== undefined) order.checkoutExpiresAt = new Date(expiresAt * 1000).toISOString();
    saveRuntimeState();
  }
}

export function closeOrder(orderId: string, status: "cancelled" | "expired" | "failed"): MockOrder | undefined {
  const order = findOrder(orderId);
  if (order && order.status === "pending") {
    order.status = status;
    order.closedAt = new Date().toISOString();
    saveRuntimeState();
  }
  return order;
}

/** What we need from a Stripe Checkout Session to trust a payment. */
export type PaidSessionFacts = {
  sessionId: string;
  orderId: string | null | undefined;
  paymentStatus: string;
  amountTotal: number | null;
  currency: string | null;
  sessionStatus?: string | null;
  livemode?: boolean;
};

/**
 * Marks the order paid and activates the promotion. Idempotent: the webhook and the
 * success return can both arrive for the same session without double-activating.
 */
export function activateFromPaidSession(facts: PaidSessionFacts, via: "webhook" | "success-return", now = new Date()) {
  const order = facts.orderId ? findOrder(facts.orderId) : findOrderBySession(facts.sessionId);
  if (!order) throw new PromotionError("No order matches this checkout session.", 404, "order_not_found");
  if (facts.livemode || !/^cs_test_[A-Za-z0-9_]+$/.test(facts.sessionId)) {
    throw new PromotionError("Only Stripe sandbox checkout sessions are supported.", 400, "live_payment_refused");
  }
  if (order.stripeCheckoutSessionId !== facts.sessionId) {
    throw new PromotionError("Checkout session does not belong to this order.", 409, "session_mismatch");
  }

  const existing = promotionForOrder(order.id);
  if (order.status === "paid" && existing) return { order, promotion: existing, alreadyActive: true };
  if (order.status !== "pending") {
    throw new PromotionError("This checkout order is already closed; create a new checkout.", 409, "order_closed");
  }
  if (facts.sessionStatus === "expired") {
    closeOrder(order.id, "expired");
    throw new PromotionError("This checkout session has expired.", 409, "checkout_expired");
  }

  if (facts.paymentStatus !== "paid") throw new PromotionError("Payment has not completed.", 409, "not_paid");
  if (facts.amountTotal !== order.amountCents || facts.currency?.toLowerCase() !== order.currency) {
    order.status = "failed";
    order.closedAt = now.toISOString();
    saveRuntimeState();
    throw new PromotionError("Paid amount does not match the plan price; promotion not activated.", 409, "amount_mismatch");
  }

  const plan = getPlan(order.planId)!;
  const event = findAnyEvent(order.eventId);
  if (!event) throw new PromotionError("The event no longer exists.", 404, "event_not_found");
  if (new Date(event.startsAt) <= now) {
    closeOrder(order.id, "failed");
    throw new PromotionError("This event has already started; promotion not activated.", 409, "event_started");
  }
  if (promotions.some((promotion) => promotion.eventId === event.id && isPurchased(promotion) && isActive(promotion, now))) {
    closeOrder(order.id, "failed");
    throw new PromotionError("This event is already promoted.", 409, "already_promoted");
  }

  order.status = "paid";
  order.paidAt = now.toISOString();
  order.confirmedVia = via;
  order.stripeCheckoutSessionId = facts.sessionId;

  const planEnd = now.getTime() + plan.durationDays * 24 * 3600 * 1000;
  const endsAt = new Date(Math.min(planEnd, new Date(event.startsAt).getTime()));
  const promotion: Promotion = {
    id: `promo_${randomUUID().slice(0, 8)}`,
    orderId: order.id,
    eventId: event.id,
    planId: plan.id,
    tier: plan.buyerType,
    label: "Promoted",
    sponsorName: order.buyer.name,
    startsAt: now.toISOString(),
    endsAt: endsAt.toISOString(),
    event: { ...event, isPaidPromotion: true, publicationStatus: "published" }
  };
  promotions.push(promotion);
  const coreEvent = getEvent(event.id);
  if (coreEvent?.hostType === "business") coreEvent.publicationStatus = "published";
  syncCorePaidFlag(event.id, now);
  saveRuntimeState();
  // Clear the flag when the boost ends, even if nobody reads /api/promotions in between.
  scheduleExpiry(promotion, now);
  return { order, promotion, alreadyActive: false };
}

function scheduleExpiry(promotion: Promotion, now = new Date()) {
  const msUntilEnd = Math.min(new Date(promotion.endsAt).getTime() - now.getTime(), 2 ** 31 - 1);
  setTimeout(() => syncCorePaidFlag(promotion.eventId), Math.max(msUntilEnd, 0) + 1000).unref();
}

// Recover active flags and timers, or clear stale flags, before serving the persisted catalogue.
syncExpiredPaidFlags();
let snapshotsChanged = false;
for (const promotion of promotions) {
  const safe = toPublicPromotion(promotion).event;
  if (JSON.stringify(promotion.event) !== JSON.stringify(safe)) {
    promotion.event = safe;
    snapshotsChanged = true;
  }
}
if (snapshotsChanged) saveRuntimeState();
for (const promotion of promotions) if (isPurchased(promotion) && isActive(promotion)) scheduleExpiry(promotion);
