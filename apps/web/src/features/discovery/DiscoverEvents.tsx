import { useEffect, useMemo, useRef, useState } from "react";
import { CreateEvent } from "../events/CreateEvent";
import { EventDetail } from "../events/EventDetail";
import { rankEvents } from "../events/recommend";
import {
  DEFAULT_INTERESTS,
  DEFAULT_RADIUS_KM,
  type DiscoveryFilters
} from "../events/types";
import { useEventsStore } from "../events/useEventsStore";
import { FilterBar } from "./FilterBar";
import { ForYouView } from "./ForYouView";
import { MapView } from "./MapView";
import { navigate, useHashRoute } from "./useHashRoute";
import "./discovery.css";

const INTEREST_KEY = "thirdplace.interests";

function loadInterests(): string[] {
  try {
    const stored = window.localStorage.getItem(INTEREST_KEY);
    const parsed: unknown = stored ? JSON.parse(stored) : null;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) return parsed;
  } catch {
    /* storage unavailable: fall back to defaults */
  }
  return DEFAULT_INTERESTS;
}

const initialFilters = (): DiscoveryFilters => ({
  query: "",
  category: "all",
  freeOnly: false,
  radiusKm: DEFAULT_RADIUS_KM,
  interests: loadInterests()
});

/**
 * Root of the For You + Map experience and the event flows (detail, join, chat, create).
 * Exported under the same name App.tsx already imports, so no shell changes are needed.
 */
export function DiscoverEvents() {
  const route = useHashRoute();
  const store = useEventsStore();
  const [filters, setFilters] = useState<DiscoveryFilters>(initialFilters);
  const [listView, setListView] = useState<"for-you" | "map">("for-you");
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (route.name === "for-you" || route.name === "map") setListView(route.name);
  }, [route]);

  useEffect(() => {
    try {
      window.localStorage.setItem(INTEREST_KEY, JSON.stringify(filters.interests));
    } catch {
      /* ignore */
    }
  }, [filters.interests]);

  // Move focus to the new view's heading area on navigation (keyboard + screen-reader friendly).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: topRef.current?.offsetTop ?? 0 });
    topRef.current?.focus();
  }, [route]);

  const ranked = useMemo(() => rankEvents(store.events, filters), [store.events, filters]);
  const resetFilters = () => setFilters({ ...initialFilters(), interests: filters.interests });
  const backHref = `#/${listView}`;

  return (
    <section id="discover" className="tp" aria-label="Discover events">
      <div ref={topRef} tabIndex={-1} className="tp-top">
        {(route.name === "for-you" || route.name === "map") && (
          <header className="tp-header">
            <div>
              <p className="tp-eyebrow">ThirdPlace</p>
              <h2 className="tp-h2">{route.name === "map" ? "Events on the map" : "For you, nearby"}</h2>
            </div>
            <div className="tp-header__actions">
              <div className="tp-tabs" role="tablist" aria-label="Discovery view">
                <a role="tab" href="#/for-you" aria-selected={route.name === "for-you"}>For You</a>
                <a role="tab" href="#/map" aria-selected={route.name === "map"}>Map</a>
              </div>
              <a className="tp-btn tp-btn--create" href="#/create">+ Create event</a>
            </div>
          </header>
        )}
      </div>

      {(route.name === "for-you" || route.name === "map") && (
        <>
          <FilterBar filters={filters} onChange={setFilters} />
          <p className="tp-sample">Sample events · clearly synthetic demo data</p>
          {store.status === "loading" && <LoadingState />}
          {store.status === "error" && (
            <div className="tp-state" role="alert">
              <h3>We couldn't load nearby events</h3>
              <p>Check your connection and try again.</p>
              <button type="button" className="tp-btn tp-btn--primary" onClick={store.reload}>Try again</button>
            </div>
          )}
          {store.status === "ready" && store.events.length === 0 && (
            <div className="tp-state">
              <h3>No events nearby yet</h3>
              <p>Be the first to start something in your area.</p>
              <a className="tp-btn tp-btn--primary" href="#/create">Create an event</a>
            </div>
          )}
          {store.status === "ready" && store.events.length > 0 && route.name === "for-you" && (
            <ForYouView ranked={ranked} joined={store.joined} filters={filters} onReset={resetFilters} />
          )}
          {store.status === "ready" && store.events.length > 0 && route.name === "map" && (
            <MapView ranked={ranked} joined={store.joined} filters={filters} onReset={resetFilters} />
          )}
        </>
      )}

      {route.name === "event" && store.status === "loading" && <LoadingState />}
      {route.name === "event" && store.status === "error" && (
        <div className="tp-state" role="alert">
          <h3>We couldn't load this event</h3>
          <button type="button" className="tp-btn tp-btn--primary" onClick={store.reload}>Try again</button>
        </div>
      )}
      {route.name === "event" && store.status === "ready" && (
        <EventDetail
          event={store.events.find((item) => item.id === route.id)}
          joined={store.joined.has(route.id)}
          messages={store.messages[route.id] ?? []}
          onJoin={store.join}
          onLeave={store.leave}
          onPost={store.postMessage}
          backHref={backHref}
        />
      )}

      {route.name === "create" && (
        <CreateEvent
          backHref={backHref}
          onCreate={store.createEvent}
          onCreated={(event) => navigate(`/event/${encodeURIComponent(event.id)}`)}
        />
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="tp-loading" role="status" aria-label="Loading events">
      <span className="tp-visually-hidden">Loading events…</span>
      {[0, 1, 2].map((i) => <div key={i} className="tp-skeleton" aria-hidden="true" />)}
    </div>
  );
}
