import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../dist/app.js";
import { generateEventPlan } from "../dist/services/eventPlanner.js";
import { askAssistant } from "../dist/services/assistant.js";

let server;
let baseUrl;

before(async () => {
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENCLAW_GATEWAY_URL;
  delete process.env.OPENCLAW_GATEWAY_TOKEN;
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

test("health and profile integration endpoints are available", async () => {
  const health = await fetch(`${baseUrl}/health`);
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { status: "ok" });
  const profile = await fetch(`${baseUrl}/profiles/me`);
  assert.equal(profile.status, 200);
  assert.equal((await profile.json()).profile.id, "me");
});

test("event planner returns a labelled synthetic plan without credentials", async () => {
  const response = await fetch(`${baseUrl}/event-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal: "Five-a-side", area: "Dublin 2", category: "sport", date: "2026-11-01T18:00", attendeeCount: 10 })
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.provider, "synthetic");
  assert.match(body.notice, /OPENROUTER_API_KEY/);
  assert.ok(body.plan.checklist.length >= 3);
});

test("event planner rejects invalid boundary input", async () => {
  const response = await fetch(`${baseUrl}/event-plans`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goal: "", area: "Dublin", category: "invalid", date: "not-a-date", attendeeCount: 1 })
  });
  assert.equal(response.status, 400);
});

test("ordinary-user event creation is durable in the API catalogue and owned by the demo user", async () => {
  const payload = { title: "API poker social", description: "A welcoming low-stakes poker table for beginners.", startsAt: new Date(Date.now() + 5 * 86400000).toISOString(), locationName: "Smithfield Games Room", category: "social", interest: "poker", area: "Smithfield", latitude: 53.3498, longitude: -6.2778, capacity: 10, priceEur: 5, hostName: "Dara L." };
  const created = await fetch(`${baseUrl}/events`, { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": "demo-user" }, body: JSON.stringify(payload) });
  assert.equal(created.status, 201);
  const event = (await created.json()).event;
  assert.equal('hostId' in event, false);
  assert.equal('attendeeIds' in event, false);
  const mine = await fetch(`${baseUrl}/events/mine`, { headers: { 'x-user-id': 'demo-user' } });
  assert.equal(mine.status, 200);
  assert.ok((await mine.json()).memberships.some((item) => item.event.id === event.id && item.role === 'hosting'));
  const other = await fetch(`${baseUrl}/events/mine`, { headers: { 'x-user-id': 'another-demo-user' } });
  assert.equal((await other.json()).memberships.some((item) => item.event.id === event.id), false);
  const invalid = await fetch(`${baseUrl}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, startsAt: "2020-01-01", capacity: 1 }) });
  assert.equal(invalid.status, 422);
});

test("recommendations do not present an unpaid seed as sponsored or bypass relevance", async () => {
  const created = await fetch(`${baseUrl}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
    body: JSON.stringify({ title: 'Free football meetup', description: 'A friendly local football session for all levels.', startsAt: new Date(Date.now() + 2 * 86400000).toISOString(), locationName: 'Public sports ground', category: 'sport', interest: 'football', area: 'Dublin city centre', latitude: 53.347, longitude: -6.26, capacity: 12, priceEur: 0, hostName: 'Demo host' })
  });
  assert.equal(created.status, 201);
  const createdEvent = (await created.json()).event;
  const response = await fetch(`${baseUrl}/recommendations?userId=me`);
  assert.equal(response.status, 200);
  const recommendations = (await response.json()).recommendations;
  const seeded = await fetch(`${baseUrl}/events/sunday-five-a-side`);
  assert.equal(seeded.status, 200);
  assert.equal((await seeded.json()).event.isPaidPromotion, false);
  const ordinary = recommendations.find((item) => item.event.id === createdEvent.id);
  assert.ok(ordinary);
  assert.equal(ordinary.scoreBreakdown.sponsored, 0);
  assert.doesNotMatch(ordinary.explanation, /Sponsored placement/);
  assert.ok(recommendations.every((item) => !('attendeeIds' in item.event) && !('hostId' in item.event)));
  assert.equal(recommendations.some((item) => item.event.id === "coastal-knitting"), false);
});

test("promotion analytics accept known actions and reject unknown ones", async () => {
  const accepted = await fetch(`${baseUrl}/analytics/events/sunday-five-a-side`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "impression" }) });
  assert.equal(accepted.status, 202);
  const summary = await fetch(`${baseUrl}/analytics/events/sunday-five-a-side`);
  assert.equal((await summary.json()).analytics.impressions, 1);
  const rejected = await fetch(`${baseUrl}/analytics/events/sunday-five-a-side`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "identity" }) });
  assert.equal(rejected.status, 400);
});

test("assistant has a safe synthetic fallback and supports the OpenClaw gateway boundary", async () => {
  const fallback = await fetch(`${baseUrl}/assistant`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: "I feel lonely and want a relaxed event." }] }) });
  assert.equal(fallback.status, 200);
  const fallbackBody = await fallback.json();
  assert.equal(fallbackBody.provider, "synthetic");
  assert.ok(Array.isArray(fallbackBody.suggestedEventIds));

  const created = await fetch(`${baseUrl}/events`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Future gateway football", description: "A friendly local football session for all levels.", startsAt: new Date(Date.now() + 3 * 86400000).toISOString(), locationName: "Public sports ground", category: "sport", interest: "football", area: "Dublin city centre", latitude: 53.347, longitude: -6.26, capacity: 12, priceEur: 0, hostName: "Demo host" })
  });
  assert.equal(created.status, 201);
  const eligibleEvent = (await created.json()).event;

  let request;
  const openClaw = await askAssistant([{ role: "user", content: "What suits me?" }], "me", "test-session", {
    openClawUrl: "http://openclaw.test:18789", openClawToken: "gateway-secret",
    fetchImpl: async (url, init) => {
      request = { url, init, body: JSON.parse(init.body) };
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ intent: "recommend", eventIds: [eligibleEvent.id] }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
  });
  assert.equal(openClaw.provider, "openclaw");
  assert.equal(request.url, "http://openclaw.test:18789/v1/chat/completions");
  assert.equal(request.init.headers.Authorization, "Bearer gateway-secret");
  assert.equal(request.body.model, "openclaw/default");
  assert.deepEqual(openClaw.suggestedEventIds, [eligibleEvent.id]);
  assert.equal(JSON.stringify(openClaw).includes("gateway-secret"), false);
});

test("OpenRouter provider parses a valid structured response without exposing its key", async () => {
  let authorization;
  const result = await generateEventPlan(
    { goal: "Coffee meetup", area: "Rathmines", category: "food", date: "2026-11-02T10:00" },
    {
      apiKey: "test-secret",
      model: "test/model",
      fetchImpl: async (_url, init) => {
        authorization = init.headers.Authorization;
        return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ title: "Coffee in Rathmines", description: "A public coffee meetup.", suggestedDurationMinutes: 60, checklist: ["Book a table"], rationale: "Simple and local." }) } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }
  );
  assert.equal(authorization, "Bearer test-secret");
  assert.equal(result.provider, "openrouter");
  assert.equal(JSON.stringify(result).includes("test-secret"), false);
});

test("OpenRouter failure is surfaced for the route to convert into a safe 502", async () => {
  await assert.rejects(() => generateEventPlan(
    { goal: "Walk", area: "Clontarf", category: "social", date: "2026-11-03T12:00" },
    { apiKey: "test-secret", model: "test/model", fetchImpl: async () => new Response("unavailable", { status: 503 }) }
  ), /status 503/);
});
