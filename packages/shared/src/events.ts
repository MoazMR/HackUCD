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
  hostId: string;
  hostType: "user" | "business";
  hostName: string;
  businessName?: string;
  area: string;
  priceEur: number;
  capacity: number;
  createdAt: string;
  publicationStatus: "draft" | "published";
};

/** Public catalogue shape: no attendance identities or internal owner identifier. */
export type PublicEventRecord = Omit<EventRecord, "attendeeIds" | "hostId">;

export type EventMembership = { event: PublicEventRecord; role: "hosting" | "going" };

export type EventRecommendation = {
  event: PublicEventRecord;
  score: number;
  distanceKm: number;
  explanation: string;
  scoreBreakdown: { interest: number; category: number; distance: number; sponsored: number };
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

export type AssistantMessage = { role: "user" | "assistant"; content: string };
export type AssistantResponse = {
  reply: string;
  provider: "openclaw" | "openrouter" | "synthetic";
  suggestedEventIds: string[];
  notice?: string;
};
