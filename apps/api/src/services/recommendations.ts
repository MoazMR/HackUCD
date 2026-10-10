import type { EventRecommendation } from "@social-outings/shared";
import { rankEligibleEvents, matchesDiscoveryFilters, isExplicitSearch, type RecommendationFilters } from "@social-outings/shared/src/recommendations.mjs";
import type { Profile } from "../models/domain.js";
import { listEvents, toPublicEvent } from "./events.js";
import { syncExpiredPaidFlags } from "./promotions.js";

export type Recommendation = EventRecommendation;

export function recommendEvents(profile: Profile, includeUnrelated = false, filters: RecommendationFilters = {}): Recommendation[] {
  syncExpiredPaidFlags();
  const now = new Date();
  const candidates = listEvents().map(toPublicEvent).filter((event) => matchesDiscoveryFilters(event, filters, now));
  return rankEligibleEvents(candidates, profile, { includeUnrelated: includeUnrelated || isExplicitSearch(filters), now: now.getTime() });
}
