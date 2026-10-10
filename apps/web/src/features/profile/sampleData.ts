import type { MyEvent } from "./types";

/** Synthetic trust history for the signed-in person. Replace with `GET /api/users/me`. */
export const SAMPLE_TRUST = { endorsementsReceived: 7, eventsAttended: 9 };

function daysFromNow(days: number, hour: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString();
}

/**
 * Synthetic events, dated relative to today so "upcoming" and "past" stay true.
 * All people and venues are made up.
 */
export function sampleMyEvents(): MyEvent[] {
  return [
    { id: "padel-doubles-bushy-park", interestId: "padel", title: "Padel doubles, beginners welcome", startsAt: daysFromNow(2, 18),
      locationName: "Bushy Park courts", role: "going", attendeeCount: 6, attendees: [] },
    { id: "poker-night-portobello", interestId: "poker", title: "Low-stakes poker night", startsAt: daysFromNow(5, 20),
      locationName: "The Barge function room", role: "hosting", attendeeCount: 8, attendees: [] },
    { id: "sunday-five-a-side", interestId: "football", title: "Sunday five-a-side", startsAt: daysFromNow(8, 10),
      locationName: "Riverside Pitches", role: "going", attendeeCount: 10, attendees: [] },
    { id: "tennis-ladder-herbert-park", interestId: "tennis", title: "Tennis ladder, round 3", startsAt: daysFromNow(-3, 17),
      locationName: "Herbert Park", role: "going", attendeeCount: 4,
      attendees: [
        { id: "p-aoife", name: "Aoife M.", interests: ["tennis", "running"], verified: true },
        { id: "p-tomasz", name: "Tomasz K.", interests: ["tennis", "padel"], verified: true },
        { id: "p-niamh", name: "Niamh D.", interests: ["tennis", "coffee"], verified: false }
      ] },
    { id: "five-a-side-belfield", interestId: "football", title: "Thursday five-a-side", startsAt: daysFromNow(-10, 19),
      locationName: "Belfield astro", role: "hosting", attendeeCount: 9,
      attendees: [
        { id: "p-conor", name: "Conor B.", interests: ["football", "poker"], verified: true },
        { id: "p-ife", name: "Ife A.", interests: ["football", "climbing"], verified: true }
      ] }
  ];
}
