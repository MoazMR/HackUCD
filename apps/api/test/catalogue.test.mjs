import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { tsImport } from "tsx/esm/api";
import { rankEligibleEvents, distanceBetweenKm, matchesDiscoveryFilters } from "@social-outings/shared/src/recommendations.mjs";

process.env.THIRDPLACE_DATA_FILE = ":memory:";
const { createApp } = await import("../dist/app.js");
const { createEvent, getEvent, toPublicEvent } = await import("../dist/services/events.js");
const { profiles } = await import("../dist/services/store.js");
const { recommendEvents } = await import("../dist/services/recommendations.js");
const { createPendingOrder, activateFromPaidSession, attachCheckoutSession, listOrders } = await import("../dist/services/promotions.js");
const { buildHotspots, clusterHotspots } = await tsImport("../../web/src/features/discovery/mapHotspots.ts", import.meta.url);
const { project } = await tsImport("../../web/src/features/events/geo.ts", import.meta.url);
const { rankEvents } = await tsImport("../../web/src/features/events/recommend.ts", import.meta.url);

let server;
let base;
const future = () => new Date(Date.now() + 5 * 86_400_000).toISOString();
const origin = { latitude: 53.347, longitude: -6.26 };
const profile = { id: "catalogue-test", displayName: "Demo", approximateLocation: origin, interests: ["football", "coding meetups", "coffee"], travelRadiusKm: 5, verificationStatus: "unverified" };

function fixture(overrides = {}) {
  return createEvent({ title: "Test football meetup", description: "A welcoming public meetup for everyone.", startsAt: future(), locationName: "Public sports venue", category: "sport", interest: "football", area: "City Centre", latitude: 53.34712345, longitude: -6.26098765, capacity: 20, priceEur: 0, hostId: "demo-user", hostName: "Demo host", ...overrides });
}

function publicSafe(value) {
  const text = JSON.stringify(value);
  assert.equal(text.includes('"attendeeIds"'), false);
  assert.equal(text.includes('"hostId"'), false);
  assert.equal(text.includes("attendance-private-person"), false);
  assert.equal(text.includes("53.34712345"), false);
  assert.equal(text.includes("-6.26098765"), false);
}

before(async () => {
  profiles.push(profile);
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  base = `http://127.0.0.1:${server.address().port}/api`;
});
after(async () => { await new Promise((resolve) => server.close(resolve)); });

test("public list, detail, attendance and recommendations omit identities and precise legacy points", async () => {
  const event = fixture();
  event.coordinates = { latitude: 53.34712345, longitude: -6.26098765 }; // an old persisted record
  event.attendeeIds.push("attendance-private-person");
  for (const path of ["/events", `/events/${event.id}`, `/recommendations?userId=${profile.id}`]) {
    const response = await fetch(`${base}${path}`);
    assert.equal(response.status, 200);
    publicSafe(await response.json());
  }
  const joined = await fetch(`${base}/events/${event.id}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "viewer-demo" }, body: "{}" });
  assert.equal(joined.status, 201);
  const body = await joined.json();
  publicSafe(body);
  assert.deepEqual(body.event.coordinates, origin);
  assert.equal(body.joined, true);
  const replay = await fetch(`${base}/events/${event.id}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "viewer-demo" }, body: "{}" });
  assert.equal(replay.status, 200);
  assert.equal((await replay.json()).joined, false);
});

test("unknown neighbourhood points are coarsened before persistence and public output", () => {
  const event = fixture({ area: "Synthetic outer neighbourhood", latitude: 53.34712345, longitude: -6.26098765 });
  assert.deepEqual(event.coordinates, { latitude: 53.35, longitude: -6.26 });
  publicSafe(toPublicEvent(event));
});

test("unpaid business drafts are hidden from public detail, messages, attendance, catalogue and recommendations", async () => {
  const event = fixture({ hostId: "business:demo venue", hostType: "business", businessName: "Demo venue", publicationStatus: "draft" });
  const list = await (await fetch(`${base}/events`)).json();
  assert.equal(list.events.some((item) => item.id === event.id), false);
  assert.equal(recommendEvents(profile, true).some((item) => item.event.id === event.id), false);
  for (const path of [`/events/${event.id}`, `/events/${event.id}/messages`]) assert.equal((await fetch(`${base}${path}`)).status, 404);
  const attendance = await fetch(`${base}/events/${event.id}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "viewer-demo" }, body: "{}" });
  assert.equal(attendance.status, 404);
});

test("free API creation appears as hosting in My Events without creating a payment order", async () => {
  const beforeOrders = listOrders().length;
  const response = await fetch(`${base}/events`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "my-events-viewer" }, body: JSON.stringify({ title: "A free community event", description: "Meet neighbours for a relaxed public afternoon.", startsAt: future(), locationName: "Public community hall", category: "social", interest: "coffee", area: "Smithfield", latitude: 53.349812345, longitude: -6.277812345, capacity: 15, priceEur: 0 }) });
  assert.equal(response.status, 201);
  const { event } = await response.json();
  publicSafe(event);
  assert.equal(listOrders().length, beforeOrders);
  const mine = await (await fetch(`${base}/events/mine`, { headers: { "x-user-id": "my-events-viewer" } })).json();
  publicSafe(mine);
  assert.equal(mine.memberships.find((item) => item.event.id === event.id)?.role, "hosting");
  const other = await (await fetch(`${base}/events/mine`, { headers: { "x-user-id": "another-demo-viewer" } })).json();
  assert.equal(other.memberships.some((item) => item.event.id === event.id), false);
});

test("joined memberships survive a reload and leaving updates the API instead of only browser state", async () => {
  const event = fixture();
  const options = { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "membership-viewer" }, body: "{}" };
  assert.equal((await fetch(`${base}/events/${event.id}/attendance`, options)).status, 201);
  const mine = await (await fetch(`${base}/events/mine`, { headers: { "x-user-id": "membership-viewer" } })).json();
  assert.equal(mine.memberships.find((item) => item.event.id === event.id)?.role, "going");
  const left = await fetch(`${base}/events/${event.id}/attendance`, { method: "DELETE", headers: { "x-user-id": "membership-viewer" } });
  assert.equal(left.status, 200);
  assert.equal((await left.json()).left, true);
  const afterLeave = await (await fetch(`${base}/events/mine`, { headers: { "x-user-id": "membership-viewer" } })).json();
  assert.equal(afterLeave.memberships.some((item) => item.event.id === event.id), false);
});

test("past, outside-radius and unrelated promotions cannot buy eligibility; explicit search only relaxes relevance", () => {
  const event = { id: "eligible", startsAt: future(), category: "sport", interests: ["football"], coordinates: origin, isPaidPromotion: false, publicationStatus: "published" };
  const outside = { ...event, id: "outside", coordinates: { latitude: origin.latitude + 5.004 / 111.19492664, longitude: origin.longitude }, isPaidPromotion: true };
  const records = [event, outside, { ...event, id: "past", startsAt: "2020-01-01", isPaidPromotion: true }, { ...event, id: "knitting", category: "social", interests: ["knitting"], isPaidPromotion: true }];
  assert.ok(distanceBetweenKm(origin, outside.coordinates) > 5);
  assert.equal(Number(distanceBetweenKm(origin, outside.coordinates).toFixed(2)), 5);
  assert.deepEqual(rankEligibleEvents(records, profile).map((item) => item.event.id), ["eligible"]);
  assert.deepEqual(new Set(rankEligibleEvents(records, profile, { includeUnrelated: true }).map((item) => item.event.id)), new Set(["eligible", "knitting"]));
  const coffeeOnly = { ...profile, interests: ["coffee"] };
  assert.equal(rankEligibleEvents([records[3]], coffeeOnly).length, 0); // same broad category is insufficient
});

test("browser and backend rank user/business events with the same explanation and component scores", () => {
  const user = fixture({ title: "User football match" });
  const business = fixture({ title: "Business football match", hostType: "business", hostId: "business:test venue", hostName: "Test venue", businessName: "Test venue" });
  const { order } = createPendingOrder({ eventId: business.id, planId: "venue-boost-7d", buyer: { type: "business", name: "Test venue" } });
  attachCheckoutSession(order.id, "cs_test_ranking");
  activateFromPaidSession({ sessionId: "cs_test_ranking", orderId: order.id, paymentStatus: "paid", amountTotal: order.amountCents, currency: "eur" }, "webhook");
  const backend = recommendEvents(profile).filter((item) => [user.id, business.id].includes(item.event.id));
  const discovery = backend.map(({ event }) => ({ ...event, interest: event.interests[0], lat: event.coordinates.latitude, lng: event.coordinates.longitude, synthetic: false }));
  const frontend = rankEvents(discovery, { query: "", category: "all", date: "any", customDate: "", timeOfDay: "any", area: "any", freeOnly: false, radiusKm: profile.travelRadiusKm, interests: profile.interests }, new Date(), { name: "City Centre", lat: origin.latitude, lng: origin.longitude });
  assert.deepEqual(frontend.map((item) => [item.event.id, item.score, item.scoreBreakdown, item.distanceKm, item.reason]), backend.map((item) => [item.event.id, item.score, item.scoreBreakdown, item.distanceKm, item.explanation]));
  for (const item of frontend) assert.equal(item.score, Object.values(item.scoreBreakdown).reduce((sum, score) => sum + score, 0));
});

test("paid promotion snapshots are public-safe and sponsored explanation requires a verified sandbox order", async () => {
  const event = fixture({ title: "Paid football event" });
  const { order } = createPendingOrder({ eventId: event.id, planId: "community-boost-3d", buyer: { type: "user" } });
  attachCheckoutSession(order.id, "cs_test_catalogue");
  activateFromPaidSession({ sessionId: "cs_test_catalogue", orderId: order.id, paymentStatus: "paid", amountTotal: order.amountCents, currency: "eur" }, "webhook");
  const recommendations = await (await fetch(`${base}/recommendations?userId=${profile.id}`)).json();
  const sponsored = recommendations.recommendations.find((item) => item.event.id === event.id);
  assert.equal(sponsored.scoreBreakdown.sponsored, 15);
  assert.match(sponsored.explanation, /Sponsored placement/);
  const promotions = await (await fetch(`${base}/promotions`)).json();
  publicSafe(promotions);
  assert.ok(promotions.promotions.some((item) => item.eventId === event.id));
  assert.equal(getEvent("sunday-five-a-side").isPaidPromotion, false);
});

test("explicit backend search matches interests outside profile without widening radius or including past events", async () => {
  const nearby = fixture({ title: "Knitting needle circle", category: "social", interest: "knitting" });
  const far = fixture({ title: "Knitting needle coast", category: "social", interest: "knitting", area: "Howth", latitude: 53.389, longitude: -6.07 });
  const past = fixture({ title: "Knitting needle past", category: "social", interest: "knitting", startsAt: "2020-01-01" });
  const baseline = recommendEvents(profile);
  assert.equal(baseline.some((item) => item.event.id === nearby.id), false);
  const result = await (await fetch(`${base}/recommendations?userId=${profile.id}&query=knitting%20needle&category=social`)).json();
  assert.ok(result.recommendations.some((item) => item.event.id === nearby.id));
  assert.equal(result.recommendations.some((item) => [far.id, past.id].includes(item.event.id)), false);
  const invalid = await fetch(`${base}/recommendations?userId=${profile.id}&date=never`);
  assert.equal(invalid.status, 400);
});

test("calendar filtering is consistent around Dublin summer midnight", () => {
  const now = new Date("2026-06-10T23:30:00Z"); // June 11 in Dublin
  const event = { id: "date", title: "Night coffee", startsAt: "2026-06-11T00:15:00Z", category: "food", interests: ["coffee"], coordinates: origin, isPaidPromotion: false };
  assert.equal(matchesDiscoveryFilters(event, { date: "today", timeOfDay: "evening" }, now), true);
  assert.equal(matchesDiscoveryFilters(event, { date: "tomorrow" }, now), false);
});


test("started and full events reject novel attendance without changing counts", async () => {
  for (const event of [fixture({ startsAt: "2020-01-01" }), fixture({ capacity: 2 })]) {
    if (new Date(event.startsAt).getTime() > Date.now()) event.attendeeCount = event.capacity;
    const count = event.attendeeCount;
    const response = await fetch(`${base}/events/${event.id}/attendance`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "new-demo-attendee" }, body: "{}" });
    assert.equal(response.status, 409);
    assert.equal(event.attendeeCount, count);
    assert.equal(event.attendeeIds.includes("new-demo-attendee"), false);
  }
});

test("coordinates and invalid calendar search filters reject boundary input", async () => {
  for (const path of ["/events?latitude=91&longitude=0&distanceKm=1", "/events?latitude=0&longitude=-181&distanceKm=1", "/events?distanceKm=1", `/recommendations?userId=${profile.id}&date=custom`, `/recommendations?userId=${profile.id}&date=custom&customDate=2026-02-30`]) {
    assert.equal((await fetch(`${base}${path}`)).status, 400);
  }
});

test("this-weekend calendar filter excludes later weekends", () => {
  const event = { id: "weekend", title: "Football", category: "sport", interests: ["football"], coordinates: origin, isPaidPromotion: false };
  const now = new Date("2026-10-12T12:00:00Z");
  assert.equal(matchesDiscoveryFilters({ ...event, startsAt: "2026-10-17T12:00:00Z" }, { date: "weekend" }, now), true);
  assert.equal(matchesDiscoveryFilters({ ...event, startsAt: "2026-10-24T12:00:00Z" }, { date: "weekend" }, now), false);
});


test("map hotspots retain City Centre aliases, Docklands and unknown public neighbourhood points", () => {
  const ranked = [
    { event: { id: "city-alias", area: "City Centre", lat: 53.347, lng: -6.26 } },
    { event: { id: "city-canonical", area: "dublin city centre", lat: 53.347, lng: -6.26 } },
    { event: { id: "docklands", area: "Docklands", lat: 53.3467, lng: -6.2382 } },
    { event: { id: "unknown-west", area: "Synthetic neighbourhood", lat: 53.35, lng: -6.3 } },
    { event: { id: "unknown-east", area: "Synthetic neighbourhood", lat: 53.35, lng: -6.29 } }
  ];
  const hotspots = buildHotspots(ranked);
  assert.equal(hotspots.length, 4);
  const city = hotspots.find((spot) => spot.area === "Dublin city centre");
  assert.deepEqual(city.items.map((item) => item.event.id), ["city-alias", "city-canonical"]);
  assert.deepEqual({ x: city.x, y: city.y }, project(53.347, -6.26));
  assert.deepEqual(hotspots.find((spot) => spot.area === "Docklands").items.map((item) => item.event.id), ["docklands"]);
  assert.deepEqual(hotspots.flatMap((spot) => spot.items.map((item) => item.event.id)).sort(), ranked.map((item) => item.event.id).sort());
  assert.equal(new Set(hotspots.map((spot) => spot.id)).size, 4);
  for (const spot of hotspots) {
    const event = spot.items[0].event;
    assert.deepEqual({ x: spot.x, y: spot.y }, project(event.lat, event.lng));
  }
});


test("map collision clusters preserve public points and leave distinct pointer targets on desktop and mobile", () => {
  const ranked = [
    { event: { id: "smithfield", area: "Smithfield", lat: 53.3498, lng: -6.2778 } },
    { event: { id: "unknown-close", area: "Synthetic neighbourhood", lat: 53.35, lng: -6.28 } },
    { event: { id: "unknown-south", area: "Synthetic neighbourhood", lat: 53.34, lng: -6.28 } },
    { event: { id: "distant", area: "Howth", lat: 53.389, lng: -6.07 } }
  ];
  const mapWidth = 960.48;
  const original = buildHotspots(ranked);
  for (const renderedWidth of [700, 320]) {
    const clusters = clusterHotspots(original, renderedWidth, mapWidth);
    assert.ok(clusters.length < original.length);
    const smithfield = clusters.find((spot) => spot.items.some((item) => item.event.id === "smithfield"));
    assert.ok(smithfield.items.some((item) => item.event.id === "unknown-close"));
    assert.ok(smithfield.areas.includes("Smithfield"));
    assert.ok(smithfield.areas.includes("Synthetic neighbourhood"));
    assert.deepEqual(clusters.flatMap((spot) => spot.items.map((item) => item.event.id)).sort(), ranked.map((item) => item.event.id).sort());
    assert.deepEqual(clusters.flatMap((spot) => spot.points.map((point) => `${point.area}:${point.x}:${point.y}`)).sort(), original.map((spot) => `${spot.area}:${spot.x}:${spot.y}`).sort());
    const scale = renderedWidth / mapWidth;
    for (let first = 0; first < clusters.length; first += 1) {
      for (let second = first + 1; second < clusters.length; second += 1) {
        assert.ok(Math.abs(clusters[first].x - clusters[second].x) * scale >= 56 || Math.abs(clusters[first].y - clusters[second].y) * scale >= 64);
      }
    }
  }
});
