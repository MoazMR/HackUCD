import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createApp } from "../dist/app.js";
import { generateEventPlan } from "../dist/services/eventPlanner.js";

let server;
let baseUrl;

before(async () => {
  delete process.env.OPENROUTER_API_KEY;
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
