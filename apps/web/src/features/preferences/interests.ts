import type { EventCategory } from "@social-outings/shared";

export type Interest = { id: string; label: string; category: EventCategory };

/** Interest tags a person can pick. `category` maps each tag onto the shared event category. */
export const INTERESTS: Interest[] = [
  { id: "football", label: "Football", category: "sport" },
  { id: "padel", label: "Padel", category: "sport" },
  { id: "tennis", label: "Tennis", category: "sport" },
  { id: "running", label: "Run clubs", category: "sport" },
  { id: "hiking", label: "Hikes", category: "sport" },
  { id: "sea-swimming", label: "Sea swims", category: "sport" },
  { id: "cycling", label: "Cycling", category: "sport" },
  { id: "climbing", label: "Climbing", category: "sport" },
  { id: "yoga", label: "Yoga", category: "sport" },
  { id: "sauna", label: "Sauna", category: "other" },
  { id: "poker", label: "Poker", category: "social" },
  { id: "board-games", label: "Board games", category: "social" },
  { id: "pub-quiz", label: "Pub quiz", category: "social" },
  { id: "book-club", label: "Book club", category: "social" },
  { id: "knitting", label: "Knitting", category: "social" },
  { id: "coding", label: "Coding meetups", category: "social" },
  { id: "live-music", label: "Live music", category: "music" },
  { id: "trad-sessions", label: "Trad sessions", category: "music" },
  { id: "dance", label: "Dance classes", category: "music" },
  { id: "cooking-classes", label: "Cooking classes", category: "food" },
  { id: "coffee", label: "Coffee", category: "food" },
  { id: "food-markets", label: "Food markets", category: "food" },
  { id: "arts-crafts", label: "Arts and crafts", category: "other" },
  { id: "film", label: "Film nights", category: "other" }
];

/**
 * The events feature names interests by their lower-case label ("run clubs"), with two
 * older exceptions. These helpers translate between a profile interest id and that name.
 */
const DISCOVERY_NAME_OVERRIDES: Record<string, string> = { "book-club": "books" };

export function toDiscoveryInterest(id: string): string {
  return DISCOVERY_NAME_OVERRIDES[id] ?? (INTERESTS.find((interest) => interest.id === id)?.label.toLowerCase() ?? id);
}

export function fromDiscoveryInterest(name: string): string {
  return INTERESTS.find((interest) => toDiscoveryInterest(interest.id) === name)?.id ?? name;
}

export function interestLabel(id: string): string {
  return INTERESTS.find((interest) => interest.id === id)?.label ?? id;
}

export function interestCategory(id: string): EventCategory {
  return INTERESTS.find((interest) => interest.id === id)?.category ?? "other";
}
