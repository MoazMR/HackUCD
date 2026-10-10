import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CreateEvent } from "../events/CreateEvent";
import { EventDetail } from "../events/EventDetail";
import { rankEvents } from "../events/recommend";
import {
  DEFAULT_INTERESTS,
  DEFAULT_RADIUS_KM,
  type DiscoveryFilters
} from "../events/types";
import { useEventsStore, type EventsStore } from "../events/useEventsStore";
import { ForYouView } from "./ForYouView";
import { InterestBar } from "./InterestBar";
import { MapView } from "./MapView";
import { SearchPanel } from "./SearchPanel";
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

/** Interests and travel radius handed in by the app shell from the person's profile. */
export type DiscoveryPreferences = { interests: string[]; radiusKm: number };

const initialFilters = (interests: string[] = loadInterests(), radiusKm: number = DEFAULT_RADIUS_KM): DiscoveryFilters => ({
  query: "",
  category: "all",
  date: "any",
  customDate: "",
  timeOfDay: "any",
  area: "any",
  freeOnly: false,
  radiusKm,
  interests
});

/**
 * Root of the For You + Map experience, the search screen, and the event flows
 * (detail, join, chat, create). The icon top bar (components/TopBar) links to
 * #/search, #/create and #/profile.
 */
export function DiscoverEvents({ store, preferences }: { store?: EventsStore; preferences?: DiscoveryPreferences } = {}) {
  // The app shell can pass one shared store so joined events survive leaving this view (My Events reads it).
  return store ? <DiscoverEventsView store={store} preferences={preferences} /> : <DiscoverEventsWithOwnStore preferences={preferences} />;
}

function DiscoverEventsWithOwnStore({ preferences }: { preferences?: DiscoveryPreferences }) {
  const store = useEventsStore();
  return <DiscoverEventsView store={store} preferences={preferences} />;
}

function DiscoverEventsView({ store, preferences }: { store: EventsStore; preferences?: DiscoveryPreferences }) {
  const route = useHashRoute();
  const [filters, setFilters] = useState<DiscoveryFilters>(() =>
    preferences && preferences.interests.length > 0
      ? initialFilters(preferences.interests, preferences.radiusKm)
      : initialFilters()
  );
  const [listView, setListView] = useState<"for-you" | "map">("for-you");
  const topRef = useRef<HTMLDivElement>(null);
  const lastRouteKey = useRef<string | null>(null);

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

  useEffect(() => {
    if (preferences) setFilters((current) => ({ ...current, interests: preferences.interests, radiusKm: preferences.radiusKm }));
  }, [preferences]);

  // Move focus to the new view's heading area on navigation (keyboard + screen-reader friendly).
  // Compare against the previous route (not a "first render" flag) so React StrictMode's
  // double-invoked effects in dev can't scroll the page down on first load.
  useEffect(() => {
    const key = JSON.stringify(route);
    if (lastRouteKey.current === null) {
      lastRouteKey.current = key;
      return;
    }
    if (lastRouteKey.current === key) return;
    lastRouteKey.current = key;
    if (route.name === "search") return; // the search box takes focus itself
    topRef.current?.scrollIntoView({ block: "start" }); // honours scroll-margin for the pinned top bar
    topRef.current?.focus({ preventScroll: true });
  }, [route]);

  const ranked = useMemo(() => rankEvents(store.events, filters), [store.events, filters]);
  const clearFilters = () => setFilters(initialFilters(filters.interests, preferences ? preferences.radiusKm : DEFAULT_RADIUS_KM));
  const backHref = `#/${listView}`;
  const onList = route.name === "for-you" || route.name === "map";

  return (
    <section id="discover" className="tp" aria-label="Discover events">
      <div ref={topRef} tabIndex={-1} className="tp-top">
        {onList && (
          <header className="tp-header">
            <div>
              <p className="tp-eyebrow">ThirdPlace</p>
              <h2 className="tp-h2">{route.name === "map" ? "Events on the map" : "For you, nearby"}</h2>
            </div>
            <div className="tp-tabs" role="tablist" aria-label="Discovery view">
              <a role="tab" href="#/for-you" aria-selected={route.name === "for-you"}>For You</a>
              <a role="tab" href="#/map" aria-selected={route.name === "map"}>Map</a>
            </div>
          </header>
        )}
      </div>

      {onList && <InterestBar filters={filters} onChange={setFilters} onClear={clearFilters} />}
      {onList && <p className="tp-sample">Prototype catalogue · seeded examples use synthetic hosts and venues</p>}
      {store.actionError && <p className="tp-error" role="alert">{store.actionError}</p>}

      {route.name === "for-you" && (
        <Loaded store={store}>
          <ForYouView ranked={ranked} joined={store.joined} filters={filters} onReset={clearFilters} />
        </Loaded>
      )}
      {route.name === "map" && (
        <Loaded store={store}>
          <MapView ranked={ranked} joined={store.joined} filters={filters} onReset={clearFilters} />
        </Loaded>
      )}

      {route.name === "search" && (
        <>
          <SearchPanel
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            onClose={() => navigate(`/${listView}`)}
            resultCount={ranked.length}
          />
          <Loaded store={store}>
            <ForYouView ranked={ranked} joined={store.joined} filters={filters} onReset={clearFilters} />
          </Loaded>
        </>
      )}

      {route.name === "event" && (
        <Loaded store={store}>
          <EventDetail
            event={store.events.find((item) => item.id === route.id)}
            joined={store.joined.has(route.id)}
            messages={store.messages[route.id] ?? []}
            onJoin={store.join}
            onLeave={store.leave}
            onPost={store.postMessage}
            backHref={backHref}
          />
        </Loaded>
      )}

      {route.name === "create" && (
        <CreateEvent
          backHref={backHref}
          onCreate={store.createEvent}
          onCreated={(event) => navigate(`/event/${encodeURIComponent(event.id)}`)}
        />
      )}

      {route.name === "profile" && (
        <div className="tp-state">
          <h3>Your profile</h3>
          <p>The profile screen is being built as part of the Profile feature. Your picture will appear on the profile icon at the top once you add one.</p>
          <a className="tp-btn tp-btn--primary" href={backHref}>Back to events</a>
        </div>
      )}
    </section>
  );
}

/** Shared loading / error / empty handling around anything that needs the event list. */
function Loaded({ store, children }: { store: EventsStore; children: ReactNode }) {
  if (store.status === "loading") {
    return (
      <div className="tp-loading" role="status" aria-label="Loading events">
        <span className="tp-visually-hidden">Loading events…</span>
        {[0, 1, 2].map((i) => <div key={i} className="tp-skeleton" aria-hidden="true" />)}
      </div>
    );
  }
  if (store.status === "error") {
    return (
      <div className="tp-state" role="alert">
        <h3>We couldn't load nearby events</h3>
        <p>Check your connection and try again.</p>
        <button type="button" className="tp-btn tp-btn--primary" onClick={store.reload}>Try again</button>
      </div>
    );
  }
  if (store.events.length === 0) {
    return (
      <div className="tp-state">
        <h3>No events nearby yet</h3>
        <p>Be the first to start something in your area.</p>
        <a className="tp-btn tp-btn--primary" href="#/create">Create Event</a>
      </div>
    );
  }
  return <>{children}</>;
}
