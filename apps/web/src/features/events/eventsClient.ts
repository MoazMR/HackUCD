import { buildSyntheticEvents } from "./syntheticData";
import type { DiscoveryEvent } from "./types";

/**
 * Single seam for event data. Today it returns clearly-labelled synthetic events
 * because GET /api/events (contract v0) has no coordinates, interests, price or
 * capacity yet. When the API grows those fields, swap the body for a `fetch("/api/events")`
 * and keep the signature.
 *
 * Demo helper: append `?state=error` or `?state=empty` to the URL to preview the
 * error and empty states.
 */
export async function loadEvents(): Promise<DiscoveryEvent[]> {
  const simulate = new URLSearchParams(window.location.search).get("state");
  await new Promise((resolve) => setTimeout(resolve, 450));
  if (simulate === "error") throw new Error("Simulated failure");
  if (simulate === "empty") return [];
  return buildSyntheticEvents();
}
