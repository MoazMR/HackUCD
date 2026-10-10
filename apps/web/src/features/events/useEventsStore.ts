import { useCallback, useEffect, useState } from "react";
import { loadEvents, publishEvent, updateAttendance } from "./eventsClient";
import { buildSeedMessages } from "./syntheticData";
import type { ChatMessage, DiscoveryEvent, NewEventDraft } from "./types";

export type LoadStatus = "loading" | "ready" | "error";

export const MAX_MESSAGE_LENGTH = 280;

/** Shared browser state, hydrated from the persistent API catalogue and viewer memberships. */
export function useEventsStore() {
  const [events, setEvents] = useState<DiscoveryEvent[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [actionError, setActionError] = useState<string>();
  const [joined, setJoined] = useState<ReadonlySet<string>>(new Set());
  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>({});

  const load = useCallback(() => {
    setStatus("loading");
    loadEvents()
      .then((loaded) => {
        setEvents(loaded);
        setJoined(new Set(loaded.filter((event) => event.joinedByViewer || event.hosting).map((event) => event.id)));
        setMessages(buildSeedMessages());
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, []);

  useEffect(load, [load]);

  const attendance = useCallback((eventId: string, shouldJoin: boolean) => {
    setActionError(undefined);
    void updateAttendance(eventId, shouldJoin).then((updated) => {
      setEvents((current) => current.map((event) => event.id === eventId
        ? { ...updated, hosting: event.hosting, joinedByViewer: shouldJoin || event.hosting, promotion: event.promotion }
        : event));
      setJoined((current) => {
        const next = new Set(current);
        if (shouldJoin) next.add(eventId);
        else next.delete(eventId);
        return next;
      });
    }).catch((error: unknown) => setActionError(error instanceof Error ? error.message : "Could not update attendance."));
  }, []);

  const join = useCallback((eventId: string) => attendance(eventId, true), [attendance]);
  const leave = useCallback((eventId: string) => {
    if (!events.find((event) => event.id === eventId)?.hosting) attendance(eventId, false);
  }, [attendance, events]);

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

  const createEvent = useCallback(async (draft: NewEventDraft): Promise<DiscoveryEvent> => {
    const event = await publishEvent(draft);
    setEvents((current) => [event, ...current]);
    setJoined((current) => new Set(current).add(event.id));
    return event;
  }, []);

  return { events, status, joined, messages, actionError, reload: load, join, leave, postMessage, createEvent };
}

export type EventsStore = ReturnType<typeof useEventsStore>;
