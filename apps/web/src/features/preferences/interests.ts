import type { EventCategory } from "@social-outings/shared";

export type Interest = { id: string; label: string; emoji: string; category: EventCategory };

/** Interest tags a person can pick. `category` maps each tag onto the shared event category. */
export const INTERESTS: Interest[] = [
  { id: "football", label: "Football", emoji: "⚽", category: "sport" },
  { id: "padel", label: "Padel", emoji: "🏓", category: "sport" },
  { id: "tennis", label: "Tennis", emoji: "🎾", category: "sport" },
  { id: "running", label: "Running", emoji: "🏃", category: "sport" },
  { id: "sea-swimming", label: "Sea swimming", emoji: "🌊", category: "sport" },
  { id: "climbing", label: "Climbing", emoji: "🧗", category: "sport" },
  { id: "hiking", label: "Hiking", emoji: "🥾", category: "sport" },
  { id: "yoga", label: "Yoga", emoji: "🧘", category: "sport" },
  { id: "poker", label: "Poker", emoji: "🃏", category: "social" },
  { id: "board-games", label: "Board games", emoji: "🎲", category: "social" },
  { id: "book-club", label: "Book club", emoji: "📚", category: "social" },
  { id: "knitting", label: "Knitting", emoji: "🧶", category: "social" },
  { id: "coding", label: "Coding meetups", emoji: "💻", category: "social" },
  { id: "live-music", label: "Live music", emoji: "🎸", category: "music" },
  { id: "trad-sessions", label: "Trad sessions", emoji: "🎻", category: "music" },
  { id: "coffee", label: "Coffee", emoji: "☕", category: "food" },
  { id: "food-markets", label: "Food markets", emoji: "🥖", category: "food" },
  { id: "film", label: "Film nights", emoji: "🎬", category: "other" }
];

export function interestLabel(id: string): string {
  return INTERESTS.find((interest) => interest.id === id)?.label ?? id;
}

export function interestEmoji(id: string): string {
  return INTERESTS.find((interest) => interest.id === id)?.emoji ?? "";
}
