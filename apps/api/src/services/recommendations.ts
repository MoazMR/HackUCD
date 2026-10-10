import type { EventRecord, Profile } from "../models/domain.js";
import { distanceBetweenKm } from "./events.js";
import { events } from "./store.js";

export type Recommendation = { event: EventRecord; score: number; distanceKm: number; explanation: string };

const categoryTerms: Record<EventRecord["category"], string[]> = {
  food: ["food", "coffee", "dining"], sport: ["sport", "football", "padel", "tennis"], music: ["music", "concert"], social: ["social", "coffee", "coding", "craft"], other: []
};

export function recommendEvents(profile: Profile, includeUnrelated = false): Recommendation[] {
  const userInterests = new Set(profile.interests.map((interest) => interest.toLowerCase()));
  return events.filter((event) => new Date(event.startsAt).getTime() > Date.now()).map((event) => {
    const distanceKm = distanceBetweenKm(profile.approximateLocation, event.coordinates);
    const matchingInterests = event.interests.filter((interest) => userInterests.has(interest.toLowerCase()));
    const categoryMatch = categoryTerms[event.category].some((term) => userInterests.has(term));
    const distanceScore = Math.max(0, Math.round((profile.travelRadiusKm - distanceKm) * 10));
    const matchLabel = matchingInterests[0] ?? (categoryMatch ? event.category : "your selected discovery filters");
    return { event, score: matchingInterests.length * 100 + (categoryMatch ? 25 : 0) + distanceScore, distanceKm: Number(distanceKm.toFixed(2)), explanation: `Matches ${matchLabel} and is ${Math.max(1, Math.round(distanceKm))} km away.`, related: matchingInterests.length > 0 || categoryMatch };
  }).filter((item) => item.distanceKm <= profile.travelRadiusKm).filter((item) => includeUnrelated || item.related).sort((a, b) => b.score - a.score).map(({ related: _related, ...item }) => item);
}
