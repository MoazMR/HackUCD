/**
 * Offline smoke test for business/promotions/payments routes.
 * Run from apps/api:  npx tsx scripts/payments-smoke.ts
 *
 * Covers normal, boundary and failure requests. Stripe's network API is not called for
 * the success path: activation is driven by a correctly signed test webhook generated
 * locally with a throwaway secret, which exercises the real webhook route.
 * Real sandbox checkout is tested manually (see features/business/README.md).
 */
import cors from "cors";
import express from "express";
import type { AddressInfo } from "node:net";
import Stripe from "stripe";

process.env.THIRDPLACE_DATA_FILE = ":memory:";
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
const { businessRouter } = await import("../src/routes/business.js");
const { paymentsRouter, stripeWebhookHandler } = await import("../src/routes/payments.js");
const { promotionsRouter } = await import("../src/routes/promotions.js");
const { createEvent, listEvents } = await import("../src/services/events.js");
const { setCheckoutSessionsForTesting } = await import("../src/services/stripe.js");
const { attachCheckoutSession, createPendingOrder, syncExpiredPaidFlags } = await import("../src/services/promotions.js");

const app = express();
app.use(cors());
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.use(express.json());
app.use("/api/business", businessRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/promotions", promotionsRouter);

const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

let passed = 0;
let r2: { status: number; body: any };
let failed = 0;
function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}`, detail ?? "");
  }
}

async function call(path: string, init?: RequestInit & { json?: unknown }) {
  const response = await fetch(base + path, {
    ...init,
    headers: init?.json !== undefined ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body
  });
  return { status: response.status, body: await response.json().catch(() => ({})) };
}

const future = (days: number) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
const WEBHOOK_SECRET = "whsec_local_test_only";
const ownEvent = createEvent({
  title: "Offline community coffee", description: "A friendly coffee meetup for local builders.", startsAt: future(5),
  locationName: "Test Library", category: "social", interest: "coffee", area: "Smithfield", latitude: 53.3487,
  longitude: -6.2789, hostId: "demo-user", hostName: "Test host"
});
// Every Stripe network method is replaced. Real SDK webhook signing/verification remains intact.
const offlineFailure = () => Object.assign(new Error("Simulated offline Stripe failure"), { type: "StripeConnectionError" });
setCheckoutSessionsForTesting({
  create: async () => { throw offlineFailure(); },
  retrieve: async () => { throw offlineFailure(); },
  expire: async () => { throw offlineFailure(); }
});

async function signedWebhook(session: Record<string, unknown>, type = "checkout.session.completed") {
  const payload = JSON.stringify({ id: `evt_${Date.now()}`, object: "event", type, data: { object: { object: "checkout.session", ...session } } });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
  return call("/api/payments/webhook", { method: "POST", body: payload, headers: { "Content-Type": "application/json", "stripe-signature": header } });
}

try {
  console.log("Pricing and configuration");
  let r = await call("/api/business/plans");
  const plans = r.body.plans as Array<{ id: string; amountCents: number; currency: string; buyerType: string }>;
  check("lists two plans in EUR", r.status === 200 && plans.length === 2 && plans.every((p) => p.currency === "eur"));
  check("venue boost is €14.99, community boost €2.99",
    plans.find((p) => p.id === "venue-boost-7d")?.amountCents === 1499 && plans.find((p) => p.id === "community-boost-3d")?.amountCents === 299);

  r = await call("/api/payments/status");
  check("reports Stripe not configured without a key", r.body.stripeConfigured === false);
  r = await call("/api/payments/checkout", { method: "POST", json: { planId: "community-boost-3d", eventId: ownEvent.id, buyer: { type: "user" } } });
  check("checkout without key -> 503 payments_not_configured", r.status === 503 && r.body.code === "payments_not_configured", r);

  process.env.STRIPE_SECRET_KEY = "sk_live_should_be_refused";
  r = await call("/api/payments/status");
  check("live key refused (sandbox only)", r.body.stripeConfigured === false && /test-mode/.test(r.body.message), r.body);
  process.env.STRIPE_SECRET_KEY = "sk_test_offline_dummy";
  r = await call("/api/payments/status");
  check("test key accepted", r.body.stripeConfigured === true);

  console.log("Business venue events");
  r = await call("/api/business/events", { method: "POST", json: {} });
  check("empty event -> 422 with field errors", r.status === 422 && Boolean(r.body.fieldErrors?.title && r.body.fieldErrors?.venueName && r.body.fieldErrors?.startsAt), r.body);
  r = await call("/api/business/events", { method: "POST", json: { businessName: "Test Café", title: "Quiz", venueName: "Test Café", venueAddressArea: "Dublin 8", category: "social", startsAt: "2020-01-01T10:00:00Z" } });
  check("past start time -> 422", r.status === 422 && Boolean(r.body.fieldErrors?.startsAt));
  r = await call("/api/business/events", { method: "POST", json: { businessName: "Test Café", title: "Quiz", venueName: "Test Café", venueAddressArea: "Dublin 8", category: "knitting", startsAt: future(2) } });
  check("unknown category -> 422", r.status === 422 && Boolean(r.body.fieldErrors?.category));
  r = await call("/api/business/events", { method: "POST", json: { businessName: "Test Café", title: "Thursday quiz night", venueName: "Test Café", venueAddressArea: "Dublin 8", category: "social", startsAt: future(2), description: "Teams of four.", interest: "Board games", priceEur: 4, capacity: 24 } });
  const bizEvent = r.body.event;
  check("venue event keeps interest, price and capacity", bizEvent?.interest === "board games" && bizEvent?.priceEur === 4 && bizEvent?.capacity === 24, bizEvent);
  r2 = await call("/api/business/events", { method: "POST", json: { businessName: "Test Café", title: "Quiz", venueName: "Test Café", venueAddressArea: "Smithfield", category: "social", startsAt: future(2), priceEur: -1, capacity: 1.5 } });
  check("bad price and capacity -> 422", r2.status === 422 && Boolean(r2.body.fieldErrors?.priceEur && r2.body.fieldErrors?.capacity), r2.body);
  check("valid venue event -> 201", r.status === 201 && bizEvent?.hostType === "business" && bizEvent?.locationName === "Test Café", r.body);
  check("unpaid business event stays out of public catalogue", !listEvents().some((event) => event.id === bizEvent.id));

  console.log("Checkout request validation");
  const checkout = (json: unknown) => call("/api/payments/checkout", { method: "POST", json });
  r = await checkout({ planId: "gold-forever", eventId: bizEvent.id, buyer: { type: "business", name: "Test Café" } });
  check("unknown plan -> 400", r.status === 400 && r.body.code === "unknown_plan");
  r = await checkout({ planId: "venue-boost-7d", eventId: ownEvent.id, buyer: { type: "user" } });
  check("user buying business plan -> 400 plan_buyer_mismatch", r.status === 400 && r.body.code === "plan_buyer_mismatch");
  r = await checkout({ planId: "community-boost-3d", eventId: "docklands-padel", buyer: { type: "user" } });
  check("user promoting someone else's event -> 403", r.status === 403 && r.body.code === "not_event_host");
  r = await checkout({ planId: "venue-boost-7d", eventId: bizEvent.id, buyer: { type: "business", name: "Rival Bar" } });
  check("business promoting another business's event -> 403", r.status === 403 && r.body.code === "not_event_host");
  r = await checkout({ planId: "venue-boost-7d", eventId: "does-not-exist", buyer: { type: "business", name: "Test Café" } });
  check("unknown event -> 404", r.status === 404 && r.body.code === "event_not_found");
  r = await checkout({ planId: "venue-boost-7d", eventId: bizEvent.id, buyer: { type: "business" } });
  check("business without name -> 400", r.status === 400);

  r = await checkout({ planId: "venue-boost-7d", eventId: bizEvent.id, buyer: { type: "business", name: "Test Café" } });
  check("simulated Stripe outage -> 502 stripe_error, no payment taken", r.status === 502 && r.body.code === "stripe_error", r);
  r = await call("/api/business/orders");
  check("that order is recorded as failed", r.body.orders.some((o: { eventId: string; status: string }) => o.eventId === bizEvent.id && o.status === "failed"));

  console.log("Webhook");
  r = await signedWebhook({ id: "cs_test_x" });
  check("webhook without STRIPE_WEBHOOK_SECRET -> 503", r.status === 503);
  process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;
  r = await call("/api/payments/webhook", { method: "POST", body: "{}", headers: { "Content-Type": "application/json", "stripe-signature": "t=1,v1=bad" } });
  check("bad signature -> 400", r.status === 400 && r.body.code === "bad_signature");

  // Seed a pending order the way /checkout does, minus the Stripe network call.
  const { order } = createPendingOrder({ planId: "venue-boost-7d", eventId: bizEvent.id, buyer: { type: "business", name: "Test Café" } });
  attachCheckoutSession(order.id, "cs_test_offline_success");
  r = await signedWebhook({ id: "cs_test_offline_success", payment_status: "paid", amount_total: 1499, currency: "eur", metadata: { orderId: order.id } });
  check("signed checkout.session.completed -> 200", r.status === 200 && r.body.received === true, r);
  r = await call("/api/promotions");
  const promo = r.body.promotions.find((p: { eventId: string }) => p.eventId === bizEvent.id);
  check("promotion now active and labelled Promoted", promo?.label === "Promoted" && promo?.sponsorName === "Test Café", r.body);
  check("paid business event is published into public catalogue", listEvents().some((event) => event.id === bizEvent.id));
  check("promotion ends when the event starts (event in 2 days < 7-day plan)", promo && new Date(promo.endsAt).getTime() === new Date(bizEvent.startsAt).getTime(), promo);

  r = await signedWebhook({ id: "cs_test_offline_success", payment_status: "paid", amount_total: 1499, currency: "eur", metadata: { orderId: order.id } });
  r = await call("/api/promotions");
  check("replayed webhook is idempotent (one promotion)", r.body.promotions.filter((p: { eventId: string }) => p.eventId === bizEvent.id).length === 1);

  r = await call("/api/payments/confirm?session_id=cs_test_offline_success");
  check("success return confirms from records after webhook", r.status === 200 && r.body.status === "active" && r.body.order.confirmedVia === "webhook", r.body);
  r = await call("/api/payments/confirm?session_id=not-a-session");
  check("confirm with invalid session id -> 400", r.status === 400);

  r = await checkout({ planId: "venue-boost-7d", eventId: bizEvent.id, buyer: { type: "business", name: "Test Café" } });
  check("promoting an already-promoted event -> 409", r.status === 409 && r.body.code === "already_promoted");

  console.log("Amount tampering and cancellation");
  const second = createPendingOrder({ planId: "community-boost-3d", eventId: ownEvent.id, buyer: { type: "user" } });
  attachCheckoutSession(second.order.id, "cs_test_offline_cheap");
  r = await signedWebhook({ id: "cs_test_offline_cheap", payment_status: "paid", amount_total: 1, currency: "eur", metadata: { orderId: second.order.id } });
  r = await call("/api/business/orders");
  const tampered = r.body.orders.find((o: { id: string }) => o.id === second.order.id);
  check("amount mismatch -> order failed, not activated", tampered?.status === "failed");
  r = await call("/api/promotions");
  check("no promotion for the mismatched payment", !r.body.promotions.some((p: { eventId: string }) => p.eventId === ownEvent.id));

  const third = createPendingOrder({ planId: "community-boost-3d", eventId: ownEvent.id, buyer: { type: "user" } });
  r = await call("/api/payments/cancel", { method: "POST", json: { orderId: third.order.id } });
  check("cancel return -> order cancelled", r.status === 200 && r.body.order.status === "cancelled");
  r = await call("/api/payments/cancel", { method: "POST", json: { orderId: "ord_missing" } });
  check("cancel unknown order -> 404", r.status === 404);
  r = await call("/api/business/my-events");
  check("demo user's own events listed, not promoted", r.body.events.some((e: { id: string }) => e.id === ownEvent.id) && r.body.events.every((e: { promoted: boolean }) => e.promoted === false));

  console.log("Privacy");
  const leaksPrivate = (event: Record<string, unknown>) => "attendeeIds" in event || "coordinates" in event;
  check("my-events hides attendee ids and exact coordinates", !r.body.events.some(leaksPrivate), r.body.events[0]);
  const p = createPendingOrder({ planId: "community-boost-3d", eventId: ownEvent.id, buyer: { type: "user" } });
  attachCheckoutSession(p.order.id, "cs_test_offline_user");
  await signedWebhook({ id: "cs_test_offline_user", payment_status: "paid", amount_total: 299, currency: "eur", metadata: { orderId: p.order.id } });
  r = await call("/api/promotions");
  const userPromo = r.body.promotions.find((x: { eventId: string }) => x.eventId === ownEvent.id);
  check("user self-promotion activates (€2.99)", userPromo?.tier === "user");
  check("promotion snapshots hide attendee ids and exact coordinates", !r.body.promotions.some((x: { event: Record<string, unknown> }) => leaksPrivate(x.event)));

  console.log("Core paid flag");
  check("bought boost sets isPaidPromotion on the core event", listEvents({ paid: true }).some((e) => e.id === ownEvent.id));
  check("unsupported seeded promotion is not represented as a paid purchase", !listEvents({ paid: true }).some((e) => e.id === "sunday-five-a-side"));
  syncExpiredPaidFlags(new Date(Date.now() + 30 * 24 * 3600 * 1000));
  check("flag clears when the boost ends", !listEvents({ paid: true }).some((e) => e.id === ownEvent.id));
  check("unsupported seed remains unpromoted after the expiry sweep", !listEvents({ paid: true }).some((e) => e.id === "sunday-five-a-side"));
} finally {
  setCheckoutSessionsForTesting();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exitCode = failed ? 1 : 0;
}
