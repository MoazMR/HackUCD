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
