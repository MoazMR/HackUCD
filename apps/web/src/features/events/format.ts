import type { DiscoveryEvent } from "./types";

const dateFormat = new Intl.DateTimeFormat("en-IE", { weekday: "short", day: "numeric", month: "short" });
const timeFormat = new Intl.DateTimeFormat("en-IE", { hour: "2-digit", minute: "2-digit", hour12: false });

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  return `${dateFormat.format(date)} · ${timeFormat.format(date)}`;
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

export function formatDay(iso: string): { weekday: string; day: string; month: string } {
  const date = new Date(iso);
  return {
    weekday: new Intl.DateTimeFormat("en-IE", { weekday: "short" }).format(date),
    day: String(date.getDate()),
    month: new Intl.DateTimeFormat("en-IE", { month: "short" }).format(date)
  };
}

export function formatPrice(priceEur: number): string {
  return priceEur <= 0 ? "Free" : `€${priceEur.toFixed(priceEur % 1 === 0 ? 0 : 2)}`;
}

export function spotsLeft(event: DiscoveryEvent): number {
  return Math.max(0, event.capacity - event.attendeeCount);
}

export function formatKm(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}
