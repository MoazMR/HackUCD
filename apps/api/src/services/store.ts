import type { EventRecord, Profile } from "../models/domain.js";

// Synthetic, in-memory prototype data. Coordinates are approximate city-centre points,
// not user addresses. Data resets whenever the API process restarts.
export const profiles: Profile[] = [
  { id: "me", displayName: "Moaz", approximateLocation: { latitude: 53.3498, longitude: -6.2603 }, interests: ["football", "coffee", "coding", "padel"], travelRadiusKm: 8, verificationStatus: "unverified" },
  { id: "alex", displayName: "Alex", approximateLocation: { latitude: 53.3438, longitude: -6.2546 }, interests: ["music", "football"], travelRadiusKm: 10, verificationStatus: "verified" }
];

export const events: EventRecord[] = [
  { id: "coffee-and-code", title: "Coffee & code", description: "Bring a laptop and meet other builders.", startsAt: "2026-10-11T14:00:00.000Z", locationName: "City Library", category: "social", attendeeCount: 12, coordinates: { latitude: 53.3492, longitude: -6.2607 }, interests: ["coffee", "coding", "technology"], isPaidPromotion: false, attendeeIds: [] },
  { id: "sunday-five-a-side", title: "Sunday five-a-side", description: "Friendly football — all experience levels welcome.", startsAt: "2026-10-12T10:00:00.000Z", locationName: "Riverside Pitches", category: "sport", attendeeCount: 8, coordinates: { latitude: 53.3455, longitude: -6.2732 }, interests: ["football", "sport"], isPaidPromotion: true, attendeeIds: [] },
  { id: "docklands-padel", title: "Docklands padel social", description: "A casual doubles session followed by a drink.", startsAt: "2026-10-13T18:00:00.000Z", locationName: "Docklands Courts", category: "sport", attendeeCount: 6, coordinates: { latitude: 53.3467, longitude: -6.2382 }, interests: ["padel", "tennis", "sport"], isPaidPromotion: false, attendeeIds: [] },
  { id: "coastal-knitting", title: "Coastal knitting circle", description: "Bring a project and enjoy a relaxed evening.", startsAt: "2026-10-13T18:30:00.000Z", locationName: "Howth Community Hall", category: "social", attendeeCount: 9, coordinates: { latitude: 53.3873, longitude: -6.0658 }, interests: ["knitting", "craft"], isPaidPromotion: false, attendeeIds: [] }
];
