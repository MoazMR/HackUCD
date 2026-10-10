import type { Profile } from "../models/domain.js";
import { profiles } from "./store.js";

export function getProfile(id: string): Profile | undefined {
  return profiles.find((profile) => profile.id === id);
}

export function updatePreferences(id: string, input: Pick<Profile, "interests" | "travelRadiusKm">): Profile | undefined {
  const profile = getProfile(id);
  if (!profile) return undefined;
  profile.interests = [...new Set(input.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean))];
  profile.travelRadiusKm = input.travelRadiusKm;
  return profile;
}
