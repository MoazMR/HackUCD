import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../../web/src/features/business/BusinessPortal.tsx", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;

function browser(href) {
  let url = new URL(href);
  return {
    get location() { return { href: url.href, search: url.search, pathname: url.pathname }; },
    history: { replaceState: (_state, _title, next) => { url = new URL(next, url); } }
  };
}

// Execute the component's actual return effect with deterministic timers and provider
// responses. A fresh mount represents a browser refresh and reads the retained URL.
function mount(window, confirm) {
  const effects = [];
  const states = [];
  const exports = {};
  const api = { confirm, orders: async () => [], businessEvents: async () => [], myEvents: async () => [], analytics: async () => ({}) };
  runInNewContext(code, {
    exports, window, URL, URLSearchParams,
    setTimeout: (callback) => { callback(); },
    sessionStorage: { getItem: () => "business", setItem: () => {} },
    require: (name) => {
      if (name === "react") return {
        useState: (initial) => [typeof initial === "function" ? initial() : initial, (value) => states.push(value)],
        useCallback: (callback) => callback,
        useMemo: (callback) => callback(),
        useEffect: (callback) => effects.push(callback)
      };
      if (name === "react/jsx-runtime") return require(name);
      if (name === "./api") return { businessApi: api, ApiError: class extends Error {}, formatPrice: () => "€0", formatDateTime: () => "future date" };
      if (name === "./BusinessEventForm") return { EMPTY_DRAFT: { businessName: "", title: "", description: "", venueName: "", category: "" }, BusinessEventForm: () => null };
      return new Proxy({}, { get: () => () => null });
    }
  });
  exports.BusinessPortal({});
  effects[1]();
  return { states };
}

async function settle() {
  for (let index = 0; index < 60; index += 1) await Promise.resolve();
}

test("pending checkout survives refresh and confirms the same session before clearing return parameters", async () => {
  const window = browser("https://thirdplace.test/business?checkout=success&session_id=cs_test_retry&view=orders#pricing");
  const requested = [];
  const first = mount(window, async (sessionId) => { requested.push(sessionId); return { status: "pending" }; });
  await settle();
  assert.equal(requested.length, 6);
  assert.ok(first.states.some((state) => state?.kind === "pending"));
  assert.equal(new URL(window.location.href).searchParams.get("session_id"), "cs_test_retry");
  assert.equal(new URL(window.location.href).searchParams.get("checkout"), "success");

  const order = { id: "order-retry", eventId: "event-retry", buyer: { type: "business" }, status: "paid" };
  const second = mount(window, async (sessionId) => { requested.push(sessionId); return { status: "active", order, promotion: { event: { title: "Published after retry" } } }; });
  await settle();
  assert.equal(requested.length, 7);
  assert.ok(requested.every((sessionId) => sessionId === "cs_test_retry"));
  assert.ok(second.states.some((state) => state?.kind === "active" && state.order.status === "paid"));
  assert.equal(window.location.href, "https://thirdplace.test/business?view=orders#pricing");
});

test("confirmation failure retains the session for a later retry", async () => {
  const window = browser("https://thirdplace.test/business?checkout=success&session_id=cs_test_retry_error");
  const mounted = mount(window, async () => { throw new Error("Verification unavailable"); });
  await settle();
  assert.ok(mounted.states.some((state) => state?.kind === "error"));
  assert.equal(new URL(window.location.href).searchParams.get("session_id"), "cs_test_retry_error");
});

test("verified expiry clears the return parameters without losing unrelated navigation", async () => {
  const window = browser("https://thirdplace.test/business?checkout=success&session_id=cs_test_expired&view=orders#pricing");
  const mounted = mount(window, async () => ({ status: "expired" }));
  await settle();
  assert.ok(mounted.states.some((state) => state?.kind === "error" && state.message.includes("expired")));
  assert.equal(window.location.href, "https://thirdplace.test/business?view=orders#pricing");
});
