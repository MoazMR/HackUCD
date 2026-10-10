import type { OutingEvent } from "@social-outings/shared";

const events: OutingEvent[] = [
  {
    id: "coffee-and-code",
    title: "Coffee & code",
    description: "Bring a laptop and meet other builders.",
    startsAt: "2026-10-11T14:00:00.000Z",
    locationName: "City Library",
    category: "social",
    attendeeCount: 12
  },
  {
    id: "sunday-five-a-side",
    title: "Sunday five-a-side",
    description: "Friendly football — all experience levels welcome.",
    startsAt: "2026-10-12T10:00:00.000Z",
    locationName: "Riverside Pitches",
    category: "sport",
    attendeeCount: 8
  }
];

export function listEvents(): OutingEvent[] {
  return events;
}

export function getEvent(id: string): OutingEvent | undefined {
  return events.find((event) => event.id === id);
}
