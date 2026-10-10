import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const appUrl = new URL("../dist/app.js", import.meta.url).href;
const profileUrl = new URL("../dist/services/profiles.js", import.meta.url).href;
const profileWriteScript = `
  import assert from "node:assert/strict";
  const { createApp } = await import(${JSON.stringify(appUrl)});
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const base = "http://127.0.0.1:" + server.address().port + "/api/profiles/me";
  try {
    const response = await fetch(base + "/preferences", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interests: [" Poker ", "coffee", "poker", ""], travelRadiusKm: 2.5, area: "Belfield" })
    });
    assert.equal(response.status, 200);
    assert.deepEqual((await response.json()).profile.interests, ["poker", "coffee"]);
    const verified = await fetch(base + "/verification", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "verified" })
    });
    assert.equal(verified.status, 200);
    assert.deepEqual(await verified.json(), { profileId: "me", status: "verified", provider: "mock" });
    const { getProfile } = await import(${JSON.stringify(profileUrl)});
    console.log(JSON.stringify(getProfile("me")));
  } finally { await new Promise((resolve) => server.close(resolve)); }
`;
const profileReadScript = `
  const { getProfile } = await import(${JSON.stringify(profileUrl)});
  console.log(JSON.stringify(getProfile("me")));
`;

function child(script, directory, dataFile) {
  const env = { ...process.env };
  // No external service or credential is needed for local profile mutations.
  for (const name of ["OPENCLAW_GATEWAY_URL", "OPENCLAW_GATEWAY_TOKEN", "OPENROUTER_API_KEY", "OPENROUTER_MODEL", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) delete env[name];
  if (dataFile === undefined) delete env.THIRDPLACE_DATA_FILE;
  else env.THIRDPLACE_DATA_FILE = dataFile;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: directory, env, encoding: "utf8", timeout: 10_000 });
  assert.equal(result.status, 0, result.stderr || result.error?.message || "Child process failed");
  assert.equal(result.stderr, "");
  return JSON.parse(result.stdout.trim());
}

function temporaryDirectory(run) {
  const directory = mkdtempSync(join(tmpdir(), "thirdplace-profiles-"));
  try { return run(directory); } finally { rmSync(directory, { recursive: true, force: true }); }
}

test("profile preferences and mock verification survive a new API process", () => temporaryDirectory((directory) => {
  const dataFile = join(directory, "runtime.json");
  const written = child(profileWriteScript, directory, dataFile);
  assert.deepEqual(written.interests, ["poker", "coffee"]);
  assert.equal(written.travelRadiusKm, 2.5);
  assert.deepEqual(written.approximateLocation, { latitude: 53.308, longitude: -6.224 });
  assert.equal(written.verificationStatus, "verified");
  assert.equal(existsSync(dataFile), true);
  assert.equal(existsSync(`${dataFile}.tmp`), false);
  const restarted = child(profileReadScript, directory, dataFile);
  assert.deepEqual(restarted, written);
  const persisted = JSON.parse(readFileSync(dataFile, "utf8"));
  assert.deepEqual(persisted.profiles.find((profile) => profile.id === "me"), written);
  const fields = Object.keys(persisted.profiles.find((profile) => profile.id === "me"));
  assert.deepEqual(fields.sort(), ["id", "displayName", "approximateLocation", "interests", "travelRadiusKm", "verificationStatus"].sort());
}));

test("disposable memory mode keeps profile changes local and creates no disk files", () => temporaryDirectory((directory) => {
  const written = child(profileWriteScript, directory, ":memory:");
  assert.equal(written.verificationStatus, "verified");
  assert.deepEqual(readdirSync(directory), []);
  const restarted = child(profileReadScript, directory, ":memory:");
  assert.equal(restarted.verificationStatus, "unverified");
  assert.notDeepEqual(restarted.interests, written.interests);
  assert.deepEqual(readdirSync(directory), []);
}));

test("the default runtime boundary also preserves changed profiles", () => temporaryDirectory((directory) => {
  const written = child(profileWriteScript, directory);
  const dataFile = join(directory, "apps", "api", ".data", "runtime.json");
  assert.equal(existsSync(dataFile), true);
  assert.deepEqual(child(profileReadScript, directory), written);
}));

test("invalid preferences and mock verification leave persistence unchanged", () => temporaryDirectory((directory) => {
  const dataFile = join(directory, "runtime.json");
  child(profileWriteScript, directory, dataFile);
  const before = readFileSync(dataFile, "utf8");
  const script = `
    import assert from "node:assert/strict";
    const { createApp } = await import(${JSON.stringify(appUrl)});
    const server = createApp().listen(0, "127.0.0.1");
    await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
    const base = "http://127.0.0.1:" + server.address().port + "/api/profiles/me";
    const call = (path, method, body) => fetch(base + path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    try {
      for (const status of ["invented", ["verified"], {}, null, 1]) assert.equal((await call("/verification", "POST", { status })).status, 400);
      for (const extra of [{ document: "fake-private-document" }, { idNumber: "fake-private-ID" }, { image: "fake-private-image" }, { mood: "fake-private-mood" }]) assert.equal((await call("/verification", "POST", { status: "verified", ...extra })).status, 400);
      for (const body of [{ interests: ["coffee"], travelRadiusKm: 0 }, { interests: [1], travelRadiusKm: 5 }, {}, null]) assert.equal((await call("/preferences", "PUT", body)).status, 400);
      for (const area of ["", "Unknown district", "123 Example Road, Belfield", {}, 1]) assert.equal((await call("/preferences", "PUT", { interests: ["coffee"], travelRadiusKm: 5, area })).status, 400);
      for (const extra of [{ latitude: 53.3081 }, { longitude: -6.2241 }, { coordinates: { latitude: 53.3081, longitude: -6.2241 } }, { approximateLocation: { latitude: 53.3081, longitude: -6.2241 } }, { address: "123 Example Road" }]) {
        assert.equal((await call("/preferences", "PUT", { interests: ["coffee"], travelRadiusKm: 5, area: "Belfield", ...extra })).status, 400);
      }
      for (const body of ['{"mood":"fake-private-mood",broken', '"fake-private-secret"']) {
        const malformed = await fetch(base + "/preferences", { method: "PUT", headers: { "Content-Type": "application/json" }, body });
        assert.equal(malformed.status, 400);
        assert.deepEqual(await malformed.json(), { error: "Invalid request body." });
      }
      const oversized = await call("/preferences", "PUT", { interests: ["coffee"], travelRadiusKm: 5, mood: "x".repeat(40_000) });
      assert.equal(oversized.status, 413);
      assert.deepEqual(await oversized.json(), { error: "Request body is too large." });
      const { getProfile } = await import(${JSON.stringify(profileUrl)});
      console.log(JSON.stringify(getProfile("me")));
    } finally { await new Promise((resolve) => server.close(resolve)); }
  `;
  const unchanged = child(script, directory, dataFile);
  assert.equal(unchanged.verificationStatus, "verified");
  assert.equal(readFileSync(dataFile, "utf8"), before);
}));

test("existing preference calls without an area retain the saved approximate neighbourhood", () => temporaryDirectory((directory) => {
  const dataFile = join(directory, "runtime.json");
  const initial = child(profileWriteScript, directory, dataFile);
  const script = `
    const { updatePreferences } = await import(${JSON.stringify(profileUrl)});
    console.log(JSON.stringify(updatePreferences("me", { interests: ["tennis"], travelRadiusKm: 8 })));
  `;
  const updated = child(script, directory, dataFile);
  assert.deepEqual(updated.approximateLocation, initial.approximateLocation);
  assert.deepEqual(updated.interests, ["tennis"]);
  assert.equal(updated.travelRadiusKm, 8);
  assert.equal(updated.verificationStatus, "verified");
  assert.deepEqual(child(profileReadScript, directory, dataFile), updated);
}));
