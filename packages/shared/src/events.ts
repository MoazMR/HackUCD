export type EventCategory = "food" | "sport" | "music" | "social" | "other";

export type OutingEvent = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  locationName: string;
  category: EventCategory;
  attendeeCount: number;
};

export type Coordinates = { latitude: number; longitude: number };

export type EventRecord = OutingEvent & {
  coordinates: Coordinates;
  interests: string[];
  isPaidPromotion: boolean;
  attendeeIds: string[];
};

export type EventRecommendation = {
  event: EventRecord;
  score: number;
  distanceKm: number;
  explanation: string;
};

export type ApiProfile = {
  id: string;
  displayName: string;
  approximateLocation: Coordinates;
  interests: string[];
  travelRadiusKm: number;
  verificationStatus: "unverified" | "pending" | "verified" | "failed";
};

export type EventPlanRequest = {
  goal: string;
  area: string;
  category: EventCategory;
  date: string;
  attendeeCount?: number;
  budget?: string;
};

export type EventPlan = {
  title: string;
  description: string;
  suggestedDurationMinutes: number;
  checklist: string[];
  rationale: string;
};

export type EventPlanResponse = {
  plan: EventPlan;
  provider: "openrouter" | "synthetic";
  model?: string;
  notice?: string;
};
