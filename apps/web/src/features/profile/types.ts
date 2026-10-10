export type AgeRange = "18-24" | "25-34" | "35-44" | "45-54" | "55+";
export const AGE_RANGES: AgeRange[] = ["18-24", "25-34", "35-44", "45-54", "55+"];

export type VerificationStatus = "not_started" | "pending" | "verified" | "failed";

export type PrivacySettings = {
  /** Show past events attended on the public profile. */
  showAttendanceHistory: boolean;
  showAgeRange: boolean;
  showGender: boolean;
};

export type EndorsementDecision = "endorsed" | "not_endorsed" | "reported";

/**
 * Everything the prototype keeps about the signed-in person.
 * Deliberately absent: birth date, address, coordinates, phone, email,
 * ID document images and ID numbers. Do not add them here.
 */
export type Profile = {
  onboarded: boolean;
  displayName: string;
  /** Small downscaled avatar chosen by the person. */
  photoDataUrl?: string;
  ageRange?: AgeRange;
  /** The person confirmed they are 18 or over. */
  ageConfirmed: boolean;
  /** Optional, self-described, free text. */
  gender: string;
  /** Approximate area id (see preferences/areas). Never coordinates. */
  areaId: string;
  radiusKm: number;
  interests: string[];
  privacy: PrivacySettings;
  /** Result of the mock check only. */
  verification: { status: VerificationStatus; updatedAt?: string };
  /** Keyed by `${eventId}:${personId}`. */
  endorsementDecisions: Record<string, EndorsementDecision>;
};

export type MyEventRole = "hosting" | "going";

export type Attendee = { id: string; name: string; interests: string[]; verified: boolean };

export type MyEvent = {
  id: string;
  title: string;
  startsAt: string;
  locationName: string;
  role: MyEventRole;
  attendeeCount: number;
  /** Other people who were there. Only filled for past events. */
  attendees: Attendee[];
};

/** What another person is allowed to see. Built by `toPublicProfile` only. */
export type PublicProfile = {
  displayName: string;
  photoDataUrl?: string;
  areaLabel: string;
  interests: string[];
  verified: boolean;
  trustScore: number;
  endorsementCount: number;
  ageRange?: AgeRange;
  gender?: string;
  pastEvents?: { title: string; when: string }[];
};
