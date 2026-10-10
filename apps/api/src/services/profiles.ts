import type { Profile } from "../models/domain.js";
import { profiles } from "./store.js";
import { saveRuntimeState } from "./runtimeState.js";
import { coordinatesForArea } from "./events.js";

export function getProfile(id: string): Profile | undefined {
  return profiles.find((profile) => profile.id === id);
}

export function updatePreferences(id: string, input: Pick<Profile, "interests" | "travelRadiusKm"> & { area?: string }): Profile | undefined {
  const profile = getProfile(id);
  if (!profile) return undefined;
  const location = input.area === undefined ? undefined : coordinatesForArea(input.area);
  if (input.area !== undefined && !location) throw new Error("Unknown approximate neighbourhood");
  profile.interests = [...new Set(input.interests.map((interest) => interest.trim().toLowerCase()).filter(Boolean))];
  profile.travelRadiusKm = input.travelRadiusKm;
  if (location) profile.approximateLocation = location;
  saveRuntimeState();
  return profile;
}

export function updateVerificationStatus(id: string, status: Profile["verificationStatus"]): Profile | undefined {
  const profile = getProfile(id);
  if (!profile) return undefined;
  profile.verificationStatus = status;
  saveRuntimeState();
  return profile;
}
