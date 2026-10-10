import { findArea } from "./geo";
import type { ChatMessage, DiscoveryEvent } from "./types";

/**
 * SYNTHETIC DATA — clearly labelled in the UI. Replace `loadEvents()` in
 * eventsClient.ts with the real `/api/events` call once the API contract includes
 * coordinates, interests, price and capacity. Dates are generated relative to "now"
 * so the demo never shows only past events. Host names are invented.
 */
type Seed = Omit<DiscoveryEvent, "startsAt" | "lat" | "lng" | "synthetic"> & { inHours: number };

const seeds: Seed[] = [
  {
    id: "padel-doubles-social", inHours: 28, title: "Padel doubles social", interest: "padel",
    description: "Rotating doubles on an indoor court. Rackets provided, beginners very welcome.",
    category: "sport", area: "Sandyford", locationName: "Sandyford Padel Courts",
    priceEur: 6, capacity: 8, attendeeCount: 5, hostName: "Aoife K."
  },
  {
    id: "low-stakes-poker", inHours: 34, title: "Low-stakes poker night", interest: "poker",
    description: "Friendly Texas hold'em with a small buy-in. We teach as we go, so no pressure.",
    category: "social", area: "Smithfield", locationName: "Smithfield Games Room",
    priceEur: 10, capacity: 9, attendeeCount: 6, hostName: "Conor M."
  },
  {
    id: "sunday-five-a-side", inHours: 46, title: "Sunday five-a-side", interest: "football",
    description: "Mixed-ability five-a-side on astro. Bibs provided, just bring boots.",
    category: "sport", area: "Belfield", locationName: "Belfield Astro Pitches",
    priceEur: 3, capacity: 10, attendeeCount: 8, hostName: "Dara L."
  },
  {
    id: "morning-tennis-rally", inHours: 22, title: "Morning tennis rally", interest: "tennis",
    description: "Relaxed rallying and a few games of doubles. Intermediate level.",
    category: "sport", area: "Donnybrook", locationName: "Herbert Park Courts",
    priceEur: 0, capacity: 4, attendeeCount: 2, hostName: "Niamh R."
  },
  {
    id: "beginner-holdem-lesson", inHours: 52, title: "Beginner hold'em lesson", interest: "poker",
    description: "Learn the rules, hand rankings and basic strategy over a few friendly practice hands.",
    category: "social", area: "Phibsborough", locationName: "Phibsborough Community Hall",
    priceEur: 0, capacity: 14, attendeeCount: 14, hostName: "Sean B."
  },
  {
    id: "padel-beginners-clinic", inHours: 72, title: "Padel beginners clinic", interest: "padel",
    description: "An hour of coached basics: grips, walls and serving, then a short game.",
    category: "sport", area: "Sandyford", locationName: "Sandyford Padel Courts",
    priceEur: 8, capacity: 12, attendeeCount: 6, hostName: "Aoife K."
  },
  {
    id: "doubles-tennis-night", inHours: 96, title: "Doubles tennis night", interest: "tennis",
    description: "Rotating partners and a light ladder. All levels, balls provided.",
    category: "sport", area: "Belfield", locationName: "Belfield Courts",
    priceEur: 4, capacity: 8, attendeeCount: 3, hostName: "Dara L."
  },
  {
    id: "howth-football-friendly", inHours: 60, title: "Howth 11-a-side friendly", interest: "football",
    description: "A full-size friendly with a swim afterwards if the weather holds.",
    category: "sport", area: "Howth", locationName: "Howth Recreation Ground",
    priceEur: 0, capacity: 22, attendeeCount: 15, hostName: "Rory D."
  },
  {
    id: "knitting-and-tea", inHours: 30, title: "Knitting & tea circle", interest: "knitting",
    description: "Bring a project or start a scarf. Needles and wool to borrow.",
    category: "other", area: "Ranelagh", locationName: "Ranelagh Library Café",
    priceEur: 0, capacity: 12, attendeeCount: 7, hostName: "Maeve T."
  },
  {
    id: "open-mic-and-chips", inHours: 40, title: "Open mic & chips", interest: "live music",
    description: "Play a song, or just listen. Sign-up on the night, all genres welcome.",
    category: "music", area: "Smithfield", locationName: "Smithfield Music Room",
    priceEur: 5, capacity: 40, attendeeCount: 18, hostName: "Lola F."
  },
  {
    id: "board-games-brunch", inHours: 26, title: "Board games brunch", interest: "board games",
    description: "Brunch plus a shelf of modern board games. Happy to teach.",
    category: "food", area: "Ranelagh", locationName: "Ranelagh Café Back Room",
    priceEur: 0, capacity: 10, attendeeCount: 4, hostName: "Ciara P."
  },
  {
    id: "book-swap-picnic", inHours: 50, title: "Book swap picnic", interest: "books",
    description: "Bring a book you loved, leave with one you will. Blankets on the lawn.",
    category: "other", area: "Donnybrook", locationName: "Herbert Park Lawn",
    priceEur: 0, capacity: 20, attendeeCount: 9, hostName: "Maeve T."
  }
];

export function buildSyntheticEvents(now: Date = new Date()): DiscoveryEvent[] {
  return seeds.map(({ inHours, ...seed }) => {
    const area = findArea(seed.area);
    const startsAt = new Date(now.getTime() + inHours * 3_600_000);
    startsAt.setMinutes(0, 0, 0);
    return {
      ...seed,
      startsAt: startsAt.toISOString(),
      lat: area?.lat ?? 53.3498,
      lng: area?.lng ?? -6.2603,
      synthetic: true
    };
  });
}

const chatSeeds: Record<string, Array<[string, string]>> = {
  "padel-doubles-social": [
    ["Aoife K.", "Courts are booked for 90 minutes. Park behind the main entrance."],
    ["Tom H.", "First time trying padel, anything I should bring?"],
    ["Aoife K.", "Just trainers and water. Rackets are on us."]
  ],
  "sunday-five-a-side": [
    ["Dara L.", "Two spots left. We'll split into light and dark bibs."],
    ["Eoin S.", "Is it 7 or 8 a side tonight?"]
  ],
  "low-stakes-poker": [["Conor M.", "Buy-in is €10 and everything goes back to the table. No pressure to play every hand."]]
};

export function buildSeedMessages(now: Date = new Date()): Record<string, ChatMessage[]> {
  const out: Record<string, ChatMessage[]> = {};
  for (const [eventId, rows] of Object.entries(chatSeeds)) {
    out[eventId] = rows.map(([author, text], index) => ({
      id: `${eventId}-seed-${index}`,
      author,
      text,
      sentAt: new Date(now.getTime() - (rows.length - index) * 25 * 60_000).toISOString(),
      mine: false
    }));
  }
  return out;
}
