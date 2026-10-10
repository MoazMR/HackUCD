export { BusinessPortal } from "./BusinessPortal";
export { PromotedBadge } from "./PromotedBadge";
export { usePromotions } from "./usePromotions";
export type { Promotion, PromotionPlan, MockOrder } from "./types";

/** Where the standalone portal lives until it is routed from App.tsx. */
export const BUSINESS_PORTAL_PATH = "/src/features/business/portal.html";
