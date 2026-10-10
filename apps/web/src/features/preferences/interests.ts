import type { EventCategory } from "@social-outings/shared";

export type Interest = { id: string; label: string; category: EventCategory };

/** Interest tags a person can pick. `category` maps each tag onto the shared event category. */
export const INTERESTS: Interest[] = [
  { id: "football", label: "Football", category: "sport" },
  { id: "padel", label: "Padel", category: "sport" },
  { id: "tennis", label: "Tennis", category: "sport" },
  { id: "running", label: "Running", category: "sport" },
  { id: "sea-swimming", label: "Sea swimming", category: "sport" },
  { id: "climbing", label: "Climbing", category: "sport" },
  { id: "hiking", label: "Hiking", category: "sport" },
  { id: "yoga", label: "Yoga", category: "sport" },
  { id: "poker", label: "Poker", category: "social" },
  { id: "board-games", label: "Board games", category: "social" },
  { id: "book-club", label: "Book club", category: "social" },
  { id: "knitting", label: "Knitting", category: "social" },
  { id: "coding", label: "Coding meetups", category: "social" },
  { id: "live-music", label: "Live music", category: "music" },
  { id: "trad-sessions", label: "Trad sessions", category: "music" },
  { id: "coffee", label: "Coffee", category: "food" },
  { id: "food-markets", label: "Food markets", category: "food" },
  { id: "film", label: "Film nights", category: "other" }
];

export function interestLabel(id: string): string {
  return INTERESTS.find((interest) => interest.id === id)?.label ?? id;
}
