import { randomUUID } from "node:crypto";
import { getEvent } from "./events.js";
import { saveRuntimeState, storedCollection } from "./runtimeState.js";

export type PromotionAction = "impression" | "detail_view" | "join" | "directions";
type Metric = { id: string; eventId: string; action: PromotionAction; createdAt: string };
const metrics = storedCollection<Metric>("promotionMetrics", []);

export function recordMetric(eventId: string, action: PromotionAction): Metric | undefined {
  if (!getEvent(eventId)) return undefined;
  const metric = { id: `metric_${randomUUID().slice(0, 10)}`, eventId, action, createdAt: new Date().toISOString() };
  metrics.push(metric);
  saveRuntimeState();
  return metric;
}

export function eventAnalytics(eventId: string) {
  const eventMetrics = metrics.filter((metric) => metric.eventId === eventId);
  const count = (action: PromotionAction) => eventMetrics.filter((metric) => metric.action === action).length;
  const impressions = count("impression");
  const detailViews = count("detail_view");
  const joins = count("join");
  return {
    eventId, impressions, detailViews, joins, directions: count("directions"),
    detailRate: impressions ? Number((detailViews / impressions).toFixed(3)) : 0,
    joinRate: impressions ? Number((joins / impressions).toFixed(3)) : 0
  };
}

export function businessAnalytics(businessName: string) {
  const eventIds = new Set(metrics.map((metric) => metric.eventId).filter((id) => getEvent(id)?.businessName?.toLowerCase() === businessName.toLowerCase()));
  return [...eventIds].map(eventAnalytics);
}
