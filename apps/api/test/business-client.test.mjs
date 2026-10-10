import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../../web/src/features/business/promotedFeed.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
function load(fetchImpl) {
  const exports = {};
  runInNewContext(code, { exports, fetch: fetchImpl });
  return exports.withPromotions;
}
const json = (promotions) => async () => new Response(JSON.stringify({ promotions }), { status: 200 });
const plain = (value) => JSON.parse(JSON.stringify(value));

// Payment snapshots label existing public events; they must never revive a removed,
// unpublished, or otherwise absent event in the browser's public catalogue.
test("promotion snapshots cannot add missing events to public discovery", async () => {
  const existing = { id: "visible", isPaidPromotion: true, hostType: "business" };
  const promotions = [
    { eventId: "visible", sponsorName: "Venue", tier: "business", endsAt: "2026-11-10" },
    { eventId: "absent-draft", sponsorName: "Hidden venue", tier: "business", event: { hostType: "business" } }
  ];
  const result = plain(await load(json(promotions))([existing]));
  assert.equal(result.length, 1);
  assert.equal(result[0].id, "visible");
  assert.equal(result[0].promotion.sponsorName, "Venue");
});

test("public paid flags preserve generic disclosure during promotion metadata failure", async () => {
  const withPromotions = load(async () => { throw new Error("network unavailable"); });
  const result = plain(await withPromotions([
    { id: "paid", isPaidPromotion: true, hostType: "user" },
    { id: "free", isPaidPromotion: false }
  ]));
  assert.deepEqual(result[0].promotion, { sponsorName: "", tier: "user" });
  assert.equal("endsAt" in result[0].promotion, false);
  assert.equal(result[1].promotion, undefined);
});

test("an expired public paid flag clears stale labels even if a snapshot was cached", async () => {
  const result = plain(await load(json([{ eventId: "expired", sponsorName: "Old sponsor", tier: "user" }]))([
    { id: "expired", isPaidPromotion: false, promotion: { sponsorName: "Old sponsor", tier: "user" } }
  ]));
  assert.equal(result[0].promotion, undefined);
});
