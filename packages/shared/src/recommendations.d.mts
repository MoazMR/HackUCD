import type { Coordinates, EventCategory } from "./events.js";
export type RankingEvent = {
  id: string; startsAt: string; category: EventCategory; interests: string[];
  coordinates: Coordinates; isPaidPromotion: boolean; publicationStatus?: "draft" | "published";
};
export type RankingProfile = { approximateLocation: Coordinates; interests: string[]; travelRadiusKm: number };
export type RecommendationScoreBreakdown = { interest: number; category: number; distance: number; sponsored: number };
export function normalizeInterest(value: string): string;
export function distanceBetweenKm(first: Coordinates, second: Coordinates): number;
export function rankEligibleEvents<T extends RankingEvent>(events: T[], profile: RankingProfile, options?: { includeUnrelated?: boolean; now?: number }): Array<{
  event: T; score: number; distanceKm: number; explanation: string; scoreBreakdown: RecommendationScoreBreakdown;
}>;
export type RecommendationFilters = {
  query?: string; category?: EventCategory | "all"; area?: string; freeOnly?: boolean;
  date?: "any" | "today" | "tomorrow" | "weekend" | "custom"; customDate?: string;
  timeOfDay?: "any" | "morning" | "afternoon" | "evening";
};
export function localDay(date: Date): string;
export function isExplicitSearch(filters: RecommendationFilters): boolean;
export function matchesDate(iso: string, filters: RecommendationFilters, now: Date): boolean;
export function matchesTimeOfDay(iso: string, timeOfDay?: RecommendationFilters["timeOfDay"]): boolean;
export function matchesDiscoveryFilters(event: RankingEvent & { title?: string; description?: string; area?: string; priceEur?: number; locationName?: string }, filters: RecommendationFilters, now?: Date): boolean;
