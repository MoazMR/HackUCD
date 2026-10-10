import { trackEvent } from "./eventsClient";

const observed = new Set<string>();

/** One anonymous impression/open per event per tab session, including React remounts.
 * Keys stay in this browser; only the action is sent to the API. Memory is the fallback
 * when session storage is disabled. Direction taps remain individual deliberate actions.
 */
export function trackEventOnce(eventId: string, action: "impression" | "detail_view"): void {
  const key = `tp-analytics:${action}:${eventId}`;
  if (observed.has(key)) return;
  observed.add(key);
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // Page memory still protects against duplicate effects when storage is unavailable.
  }
  trackEvent(eventId, action);
}
