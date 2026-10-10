import { areaName } from "../preferences/areas";
import { SAMPLE_TRUST } from "./sampleData";
import type { MyEvent, Profile, PublicProfile } from "./types";

export type TrustBreakdown = { score: number; parts: { label: string; points: number; max: number }[] };

/**
 * A transparent score out of 100. Reports are not counted here: they go to a
 * moderator and only change anything after a person has reviewed them.
 */
export function trustBreakdown(profile: Profile, trust = SAMPLE_TRUST): TrustBreakdown {
  const parts = [
    { label: "Joined ThirdPlace", points: 20, max: 20 },
    { label: "ID check", points: profile.verification.status === "verified" ? 30 : 0, max: 30 },
    { label: `${trust.endorsementsReceived} endorsements from people you met`, points: Math.min(trust.endorsementsReceived * 5, 35), max: 35 },
    { label: `${trust.eventsAttended} events attended`, points: Math.min(trust.eventsAttended * 2, 15), max: 15 }
  ];
  return { score: parts.reduce((sum, part) => sum + part.points, 0), parts };
}

const dateOnly = new Intl.DateTimeFormat("en-IE", { month: "long", year: "numeric" });

/**
 * The only way to turn a private profile into something shown to other people.
 * It copies allowed fields one by one, so new private fields stay private by default.
 */
export function toPublicProfile(profile: Profile, pastEvents: MyEvent[], trust = SAMPLE_TRUST): PublicProfile {
  const result: PublicProfile = {
    displayName: profile.displayName.trim() || "New member",
    photoDataUrl: profile.photoDataUrl,
    areaLabel: profile.areaId ? `${areaName(profile.areaId)} area` : "Area not set",
    interests: profile.interests,
    verified: profile.verification.status === "verified",
    trustScore: trustBreakdown(profile, trust).score,
    endorsementCount: trust.endorsementsReceived
  };
  if (profile.privacy.showAgeRange && profile.ageRange) result.ageRange = profile.ageRange;
  if (profile.privacy.showGender && profile.gender.trim()) result.gender = profile.gender.trim();
  if (profile.privacy.showAttendanceHistory) {
    result.pastEvents = pastEvents.map((event) => ({ title: event.title, when: dateOnly.format(new Date(event.startsAt)) }));
  }
  return result;
}
