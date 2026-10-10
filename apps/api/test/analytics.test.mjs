import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

process.env.THIRDPLACE_DATA_FILE = ":memory:";
const { storedCollection } = await import("../dist/services/runtimeState.js");
// Legacy records are migrated before the API starts; unsupported private fields must
// disappear instead of being retained alongside new aggregate counters.
storedCollection("promotionMetrics", [
  { id: "legacy-a", eventId: "coffee-and-code", action: "impression", createdAt: "2026-10-09T12:00:00Z", userId: "legacy-person", mood: "legacy-mood" },
  { id: "legacy-b", eventId: "coffee-and-code", action: "impression", createdAt: "2026-10-09T13:00:00Z" }
]);
const { createApp } = await import("../dist/app.js");
const { createEvent } = await import("../dist/services/events.js");
const { createBusinessEvent } = await import("../dist/services/businessEvents.js");
const { attachCheckoutSession, activateFromPaidSession, createPendingOrder } = await import("../dist/services/promotions.js");

let server;
let baseUrl;
before(async () => {
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { if (server) await new Promise((resolve) => server.close(resolve)); });
const post = (path, body) => fetch(`${baseUrl}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const summary = async (eventId) => (await (await fetch(`${baseUrl}/analytics/events/${eventId}`)).json()).analytics;

function futureEvent(title = "Analytics test gathering") {
  return createEvent({ title, description: "An anonymous aggregate analytics fixture.", startsAt: new Date(Date.now() + 14 * 86400000).toISOString(), locationName: "Community venue", category: "social", interest: "poker", area: "Smithfield", latitude: 53.3487, longitude: -6.2789, capacity: 20, hostId: "demo-user", hostName: "Demo host" });
}

function payFor(event) {
  const { order } = createPendingOrder({ planId: "community-boost-3d", eventId: event.id, buyer: { type: "user" } });
  const sessionId = `cs_test_analytics_${order.id}`;
  attachCheckoutSession(order.id, sessionId);
  return activateFromPaidSession({ sessionId, orderId: order.id, paymentStatus: "paid", amountTotal: order.amountCents, currency: "eur" }, "webhook");
}

test("legacy action rows become aggregate counters without identities or mood", async () => {
  assert.equal((await summary("coffee-and-code")).impressions, 2);
  assert.deepEqual(storedCollection("promotionMetrics", []).find((metric) => metric.eventId === "coffee-and-code"), { eventId: "coffee-and-code", action: "impression", count: 2 });
});

test("analytics reject invalid actions and unknown events without adding counters", async () => {
  const event = futureEvent();
  for (const action of ["identity", "", null, {}, ["join"]]) {
    assert.equal((await post(`/analytics/events/${event.id}`, { action })).status, 400);
  }
  assert.equal((await post(`/analytics/events/${event.id}`, {})).status, 400);
  assert.equal((await post("/analytics/events/missing-event", { action: "impression" })).status, 404);
  assert.equal((await fetch(`${baseUrl}/analytics/events/missing-event`)).status, 404);
  assert.equal((await summary(event.id)).impressions, 0);
});

test("action counters persist aggregates only and never copy request identity or mood", async () => {
  const event = futureEvent();
  for (let index = 0; index < 3; index += 1) {
    const response = await post(`/analytics/events/${event.id}`, { action: "impression", userId: "private-identity", mood: "private-mood", sessionId: "private-session" });
    assert.equal(response.status, 202);
  }
  const rows = storedCollection("promotionMetrics", []).filter((metric) => metric.eventId === event.id);
  assert.deepEqual(rows, [{ eventId: event.id, action: "impression", count: 3 }]);
  const counts = await summary(event.id);
  assert.equal(counts.impressions, 3);
  assert.equal(counts.paidAmountCents, 0);
  assert.equal(counts.costPerJoinCents, null);
});

test("successful promoted joins are counted once, directions taps count, and cost uses the paid order", async () => {
  const event = futureEvent();
  // Actions before a paid campaign never enter its cost-per-join denominator.
  await post(`/analytics/events/${event.id}`, { action: "join" });
  const { order } = payFor(event);
  assert.equal((await summary(event.id)).costPerJoinCents, null);
  assert.equal((await post(`/events/${event.id}/attendance`, { userId: "analytics-attendee" })).status, 201);
  assert.equal((await post(`/events/${event.id}/attendance`, { userId: "analytics-attendee" })).status, 200);
  assert.equal((await post(`/analytics/events/${event.id}`, { action: "directions" })).status, 202);
  assert.equal((await post(`/analytics/events/${event.id}`, { action: "directions" })).status, 202);
  const counts = await summary(event.id);
  assert.equal(counts.joins, 2);
  assert.equal(counts.paidJoins, 1);
  assert.equal(counts.directions, 2);
  assert.equal(counts.paidAmountCents, order.amountCents);
  assert.equal(counts.costPerJoinCents, 299);
  assert.equal(counts.currency, "eur");
  const rows = storedCollection("promotionMetrics", []).filter((metric) => metric.eventId === event.id);
  for (const metric of rows) {
    assert.ok(Object.keys(metric).every((key) => ["eventId", "action", "count", "orderId"].includes(key)));
    assert.equal(JSON.stringify(metric).includes("analytics-attendee"), false);
  }
});

test("expired paid campaigns do not attribute new joins to old spend", async () => {
  const event = futureEvent();
  const { promotion, order } = payFor(event);
  promotion.endsAt = new Date(Date.now() - 1000).toISOString();
  await post(`/analytics/events/${event.id}`, { action: "join" });
  const counts = await summary(event.id);
  assert.equal(counts.joins, 1);
  assert.equal(counts.paidJoins, 0);
  assert.equal(counts.paidAmountCents, order.amountCents);
  assert.equal(counts.costPerJoinCents, null);
});

test("business summaries include a saved draft even before its first action", async () => {
  const business = "Analytics empty business";
  const event = createBusinessEvent({ businessName: business, title: "Private venue draft", description: "A draft before payment.", startsAt: new Date(Date.now() + 14 * 86400000).toISOString(), venueName: "Community venue", venueAddressArea: "Smithfield", category: "social", interest: "poker", capacity: 20 });
  const response = await fetch(`${baseUrl}/analytics/business?businessName=${encodeURIComponent(business.toUpperCase())}`);
  assert.equal(response.status, 200);
  const analytics = (await response.json()).analytics;
  assert.equal(analytics.length, 1);
  assert.equal(analytics[0].eventId, event.id);
  assert.equal(analytics[0].impressions, 0);
  assert.equal((await fetch(`${baseUrl}/analytics/business`)).status, 400);
});

test("aggregate paid-campaign actions and cost survive an API process restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "thirdplace-analytics-"));
  const dataFile = join(directory, "runtime.json");
  const directoryUrl = new URL("../dist/services/", import.meta.url).href;
  const run = (code) => {
    const result = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
      env: { ...process.env, THIRDPLACE_DATA_FILE: dataFile }, encoding: "utf8"
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  };
  try {
    const first = run(`
      const { createEvent } = await import(${JSON.stringify(`${directoryUrl}events.js`)});
      const { createPendingOrder, attachCheckoutSession, activateFromPaidSession } = await import(${JSON.stringify(`${directoryUrl}promotions.js`)});
      const { recordMetric, eventAnalytics } = await import(${JSON.stringify(`${directoryUrl}analytics.js`)});
      const event = createEvent({ title: "Restart analytics", description: "A durable aggregate fixture.", startsAt: new Date(Date.now() + 14 * 86400000).toISOString(), locationName: "Venue", category: "social", interest: "poker", area: "Smithfield", latitude: 53.3487, longitude: -6.2789, hostId: "demo-user", hostName: "Demo host" });
      const { order } = createPendingOrder({ planId: "community-boost-3d", eventId: event.id, buyer: { type: "user" } });
      const sessionId = "cs_test_restart_analytics";
      attachCheckoutSession(order.id, sessionId);
      activateFromPaidSession({ sessionId, orderId: order.id, paymentStatus: "paid", amountTotal: order.amountCents, currency: "eur" }, "webhook");
      recordMetric(event.id, "join"); recordMetric(event.id, "directions"); recordMetric(event.id, "directions");
      console.log(JSON.stringify(eventAnalytics(event.id)));
    `);
    const second = run(`
      const { eventAnalytics } = await import(${JSON.stringify(`${directoryUrl}analytics.js`)});
      console.log(JSON.stringify(eventAnalytics(${JSON.stringify(first.eventId)})));
    `);
    assert.deepEqual(second, first);
    assert.equal(second.paidJoins, 1);
    assert.equal(second.costPerJoinCents, 299);
    assert.equal(second.directions, 2);
    const counters = JSON.parse(readFileSync(dataFile, "utf8")).promotionMetrics;
    assert.equal(counters.length, 2);
    for (const counter of counters) assert.ok(Object.keys(counter).every((key) => ["eventId", "action", "count", "orderId"].includes(key)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
