import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const source = readFileSync(new URL("../../web/src/features/events/analytics.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;

function loadHelper(storage, calls) {
  const exports = {};
  runInNewContext(code, {
    exports, sessionStorage: storage,
    require: (name) => {
      assert.equal(name, "./eventsClient");
      return { trackEvent: (...args) => calls.push(args) };
    }
  });
  return exports.trackEventOnce;
}

function sessionStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
}

test("rerenders, StrictMode remounts, and page reloads send one event action per tab session", () => {
  const calls = [];
  const storage = sessionStorage();
  const track = loadHelper(storage, calls);
  track("event-a", "impression");
  track("event-a", "impression");
  track("event-a", "detail_view");
  track("event-a", "detail_view");
  track("event-b", "impression");
  const reloaded = loadHelper(storage, calls);
  reloaded("event-a", "impression");
  reloaded("event-a", "detail_view");
  assert.deepEqual(calls, [["event-a", "impression"], ["event-a", "detail_view"], ["event-b", "impression"]]);
  loadHelper(sessionStorage(), calls)("event-a", "impression");
  assert.equal(calls.length, 4);
});

test("disabled storage uses page-memory dedup without sending identity or session data", () => {
  const calls = [];
  const disabled = { getItem: () => { throw new Error("storage disabled"); }, setItem: () => { throw new Error("storage disabled"); } };
  const track = loadHelper(disabled, calls);
  track("event-a", "impression");
  track("event-a", "impression");
  assert.deepEqual(calls, [["event-a", "impression"]]);
});
