import { useCallback, useEffect, useState } from "react";
import { loadEvents } from "./eventsClient";
import { findArea } from "./geo";
import { buildSeedMessages } from "./syntheticData";
import type { ChatMessage, DiscoveryEvent, NewEventDraft } from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export const MAX_MESSAGE_LENGTH = 280;

/** In-memory state for the discovery + event flows (synthetic until the API is ready). */
export function useEventsStore() {
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [joined, setJoined] = useState<ReadonlySet<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  const load = useCallback(() => {
    setStatus("loading");
    loadEvents()
      .then((loaded) => {
        setEvents(loaded);
        setMessages(buildSeedMessages());
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  const join = useCallback((eventId: string) => {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId && event.attendeeCount < event.capacity
          ? { ...event, attendeeCount: event.attendeeCount + 1 }
          : event
      )
    );
    setJoined((current) => new Set(current).add(eventId));
  }, []);

  const leave = useCallback((eventId: string) => {
    setEvents((current) =>
      current.map((event) =>
        event.id === eventId ? { ...event, attendeeCount: Math.max(0, event.attendeeCount - 1) } : event
      )
    );
    setJoined((current) => {
      const next = new Set(current);
      next.delete(eventId);
      return next;
    });
  }, []);

  const postMessage = useCallback((eventId: string, rawText: string): boolean => {
    const text = rawText.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) return false;
    const message: ChatMessage = {
      id: `${eventId}-${Date.now()}`,
      author: "You",
      text,
      sentAt: new Date().toISOString(),
      mine: true
    };
    setMessages((current) => ({ ...current, [eventId]: [...(current[eventId] ?? []), message] }));
    return true;
  }, []);

  const createEvent = useCallback((draft: NewEventDraft): DiscoveryEvent => {
    const area = findArea(draft.area);
    const event: DiscoveryEvent = {
      id: `user-${Date.now().toString(36)}`,
      title: draft.title.trim(),
      description: draft.description.trim(),
      startsAt: new Date(draft.startsAt).toISOString(),
      locationName: draft.locationName.trim(),
      category: draft.category,
      attendeeCount: 1,
      interest: draft.interest,
      area: draft.area,
      lat: area?.lat ?? 53.3498,
      lng: area?.lng ?? -6.2603,
      priceEur: draft.priceEur,
      capacity: draft.capacity,
      hostName: "You",
      synthetic: true
    };
    setEvents((current) => [event, ...current]);
    setJoined((current) => new Set(current).add(event.id));
    return event;
  }, []);

  return { events, status, joined, messages, reload: load, join, leave, postMessage, createEvent };
}

export type EventsStore = ReturnType<typeof useEventsStore>;
