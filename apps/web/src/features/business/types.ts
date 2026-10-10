import type { EventCategory, OutingEvent } from "@social-outings/shared";

// Frontend copies of the business/payments API shapes (see docs/API-CONTRACT.md).
// Candidates to move into packages/shared once the team agrees.

export type BuyerType = "business" | "user";

export type PromotionPlan = {
  id: "venue-boost-7d" | "community-boost-3d";
  name: string;
  buyerType: BuyerType;
  amountCents: number;
  currency: "eur";
  durationDays: number;
  billing: "one-time";
  summary: string;
  includes: string[];
};

export type HostedEvent = OutingEvent & {
  hostType?: BuyerType;
  businessName?: string;
  venueAddressArea?: string;
  interest?: string;
  interests?: string[];
  priceEur?: number;
  capacity?: number;
  promoted?: boolean;
  publicationStatus?: "draft" | "published";
};

export type EventAnalytics = { eventId: string; impressions: number; detailViews: number; joins: number; directions: number; detailRate: number; joinRate: number };

export type OrderStatus = "pending" | "paid" | "cancelled" | "expired" | "failed";

export type MockOrder = {
  id: string;
  planId: PromotionPlan["id"];
  eventId: string;
  eventTitle: string;
  buyer: { type: BuyerType; id: string; name: string };
  amountCents: number;
  currency: "eur";
  status: OrderStatus;
  stripeCheckoutSessionId?: string;
  confirmedVia?: "webhook" | "success-return";
  createdAt: string;
  paidAt?: string;
  closedAt?: string;
};

export type Promotion = {
  id: string;
  eventId: string;
  tier: BuyerType;
  label: "Promoted";
  sponsorName: string;
  startsAt: string;
  endsAt: string;
  event: HostedEvent;
};

export type PaymentsStatus = {
  stripeConfigured: boolean;
  webhookConfigured: boolean;
  mode: "test";
  message?: string;
};

export type BusinessEventDraft = {
  businessName: string;
  title: string;
  description: string;
  startsAt: string; // value of a datetime-local input
  venueName: string;
  venueAddressArea: string;
  category: EventCategory | "";
  interest: string;
  priceEur: string; // text input value, euro
  capacity: string; // text input value
};

export type FieldErrors = Partial<Record<keyof BusinessEventDraft, string>>;
