import { getEvent, listAllEvents } from "./events.js";
import { isActive, listOrders, promotionForOrder } from "./promotions.js";
import { saveRuntimeState, storedCollection } from "./runtimeState.js";

export type PromotionAction = "impression" | "detail_view" | "join" | "directions";
type Metric = { eventId: string; action: PromotionAction; count: number; orderId?: string };
const actions: PromotionAction[] = ["impression", "detail_view", "join", "directions"];
const storedMetrics = storedCollection<unknown>("promotionMetrics", []);

export function isPromotionAction(value: unknown): value is PromotionAction {
  return typeof value === "string" && actions.includes(value as PromotionAction);
}

function paidOrderAt(eventId: string, at: Date): string | undefined {
  return listOrders().find((order) => {
    const promotion = promotionForOrder(order.id);
    return order.eventId === eventId && order.status === "paid" && promotion && isActive(promotion, at);
  })?.id;
}

// Convert earlier per-action records into anonymous aggregate buckets, and keep only
// the fields this boundary supports. Historical timestamps are used only for migration.
const migrated: Metric[] = [];
for (const raw of storedMetrics) {
  if (!raw || typeof raw !== "object") continue;
  const metric = raw as Record<string, unknown>;
  if (typeof metric.eventId !== "string" || !isPromotionAction(metric.action)) continue;
  const count = metric.count === undefined && typeof metric.createdAt === "string" ? 1 : metric.count;
  if (typeof count !== "number" || !Number.isSafeInteger(count) || count < 1) continue;
  const orderId = typeof metric.orderId === "string" ? metric.orderId
    : typeof metric.createdAt === "string" ? paidOrderAt(metric.eventId, new Date(metric.createdAt)) : undefined;
  const existing = migrated.find((bucket) => bucket.eventId === metric.eventId && bucket.action === metric.action && bucket.orderId === orderId);
  if (existing) existing.count += count;
  else migrated.push({ eventId: metric.eventId, action: metric.action, count, ...(orderId ? { orderId } : {}) });
}
if (JSON.stringify(storedMetrics) !== JSON.stringify(migrated)) {
  storedMetrics.splice(0, storedMetrics.length, ...migrated);
  saveRuntimeState();
}
const metrics = storedMetrics as Metric[];

/** Anonymous counts only: the browser never supplies an identity or session token. */
export function recordMetric(eventId: string, action: PromotionAction): Metric | undefined {
  if (!getEvent(eventId) || !isPromotionAction(action)) return undefined;
  const orderId = paidOrderAt(eventId, new Date());
  let metric = metrics.find((bucket) => bucket.eventId === eventId && bucket.action === action && bucket.orderId === orderId);
  if (metric) metric.count += 1;
  else {
    metric = { eventId, action, count: 1, ...(orderId ? { orderId } : {}) };
    metrics.push(metric);
  }
  saveRuntimeState();
  return metric;
}

export function eventAnalytics(eventId: string) {
  const eventMetrics = metrics.filter((metric) => metric.eventId === eventId);
  const count = (action: PromotionAction) => eventMetrics.filter((metric) => metric.action === action).reduce((sum, metric) => sum + metric.count, 0);
  const impressions = count("impression");
  const detailViews = count("detail_view");
  const joins = count("join");
  const paidOrders = listOrders().filter((order) => order.eventId === eventId && order.status === "paid" && promotionForOrder(order.id));
  const paidOrderIds = new Set(paidOrders.map((order) => order.id));
  const paidAmountCents = paidOrders.reduce((sum, order) => sum + order.amountCents, 0);
  const paidJoins = eventMetrics.filter((metric) => metric.action === "join" && metric.orderId && paidOrderIds.has(metric.orderId))
    .reduce((sum, metric) => sum + metric.count, 0);
  return {
    eventId, impressions, detailViews, joins, directions: count("directions"),
    detailRate: impressions ? Number((detailViews / impressions).toFixed(3)) : 0,
    joinRate: impressions ? Number((joins / impressions).toFixed(3)) : 0,
    paidAmountCents, paidJoins, currency: "eur" as const,
    costPerJoinCents: paidJoins ? Math.round(paidAmountCents / paidJoins) : null
  };
}

export function businessAnalytics(businessName: string) {
  return listAllEvents().filter((event) => event.businessName?.toLowerCase() === businessName.toLowerCase())
    .map((event) => eventAnalytics(event.id));
}
