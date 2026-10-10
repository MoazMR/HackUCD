import type { EventCategory, OutingEvent } from "@social-outings/shared";

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

export type Profile = {
  id: string;
  displayName: string;
  approximateLocation: Coordinates;
  interests: string[];
  travelRadiusKm: number;
  verificationStatus: "unverified" | "pending" | "verified" | "failed";
};

export type PublicEventMessage = { id: string; eventId: string; authorId: string; body: string; createdAt: string };
export type Endorsement = { id: string; authorId: string; subjectId: string; eventId: string; createdAt: string };
export type Report = { id: string; reporterId: string; subjectId: string; eventId?: string; reason: string; credible: boolean; createdAt: string };
export type AccountModeration = { subjectId: string; credibleReportCount: number; status: "clear" | "flagged_for_review" };
export type EventFilters = { category?: EventCategory; location?: string; latitude?: number; longitude?: number; distanceKm?: number; paid?: boolean };
