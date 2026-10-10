import { useEffect, useMemo, useState } from "react";
import { Onboarding } from "./features/auth/Onboarding";
import { DiscoverEvents } from "./features/discovery/DiscoverEvents";
import { setUserOrigin } from "./features/events/geo";
import { INTERESTS as DISCOVERY_INTERESTS } from "./features/events/types";
import { useEventsStore } from "./features/events/useEventsStore";
import { EventPlanner } from "./features/planning/EventPlanner";
import { AREAS, fromDiscoveryInterest, toDiscoveryInterest } from "./features/preferences";
import { EndorsementScreen, Logo, MyEventsView, ProfileProvider, ProfileView, sampleMyEvents, useProfile, type MyEvent } from "./features/profile";
import { ProfileApiSync } from "./integration/ProfileApiSync";
import { BUSINESS_PORTAL_PATH } from "./features/business/paths";

type MainView = "for-you" | "map" | "my-events" | "profile";
/** Discovery sub-routes handled inside Kate's DiscoverEvents (#/event/:id, #/create, #/search). */
type DiscoveryRoute = "event" | "create" | "search";
type View = MainView | "plan" | DiscoveryRoute;
const mainViews: Array<{ id: MainView; label: string }> = [
  { id: "for-you", label: "For You" }, { id: "map", label: "Map" },
  { id: "my-events", label: "My Events" }, { id: "profile", label: "Profile" }
];
const discoveryRoutes: DiscoveryRoute[] = ["event", "create", "search"];

/** Accepts both "#map" (shell nav) and "#/map" / "#/event/:id" (discovery links). */
function viewFromHash(): View {
  const first = window.location.hash.replace(/^#\/?/, "").split("/")[0] as View;
  return [...mainViews.map((item) => item.id), "plan", ...discoveryRoutes].includes(first) ? first : "for-you";
}

const discoveryInterestNames: readonly string[] = DISCOVERY_INTERESTS;

export function App() {
  return <ProfileProvider><AppContent /></ProfileProvider>;
}

function AppContent() {
  const { profile } = useProfile();
  const [view, setViewState] = useState<View>(viewFromHash);
  const [endorsementEventId, setEndorsementEventId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  // One events store for the whole shell, so events joined or created in discovery show up in My Events.
  const store = useEventsStore();

  // Discovery reads the approximate area, interests and radius chosen in the profile.
  const area = AREAS.find((item) => item.id === profile.areaId);
  if (area) setUserOrigin({ name: area.name, lat: area.lat, lng: area.lng });
  const preferences = useMemo(() => ({
    interests: profile.interests.map(toDiscoveryInterest).filter((name) => discoveryInterestNames.includes(name)),
    radiusKm: profile.radiusKm
  }), [profile.interests, profile.radiusKm]);

  // My Events: upcoming comes from the shared store; past stays sample data so endorsements can be demonstrated.
  const samplePast = useMemo(() => sampleMyEvents().filter((event) => new Date(event.startsAt).getTime() < Date.now()), []);
  const events = useMemo<MyEvent[]>(() => [
    ...store.events.filter((event) => store.joined.has(event.id)).map((event): MyEvent => ({
      id: event.id,
      title: event.title,
      startsAt: event.startsAt,
      locationName: `${event.locationName}, ${event.area}`,
      role: event.hostName === "You" ? "hosting" : "going",
      interestId: fromDiscoveryInterest(event.interest),
      attendeeCount: event.attendeeCount,
      attendees: []
    })),
    ...samplePast
  ], [store.events, store.joined, samplePast]);
  const openEvent = (id: string) => {
    if (store.events.some((event) => event.id === id)) window.location.hash = `/event/${encodeURIComponent(id)}`;
    else setNotice("This is a sample past event, so it has no live page or chat.");
  };

  useEffect(() => {
    const onHashChange = () => { setViewState(viewFromHash()); setEndorsementEventId(undefined); };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function setView(next: View) {
    window.location.hash = next;
    setViewState(next);
    setEndorsementEventId(undefined);
    setNotice(undefined);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!profile.onboarded) return <main className="page-shell"><Onboarding onComplete={() => setView("for-you")} /></main>;
  const endorsementEvent = endorsementEventId ? events.find((event) => event.id === endorsementEventId) : undefined;

  return (
    <div className="page-shell">
      <header className="topbar">
        <button className="brand" type="button" onClick={() => setView("for-you")}><Logo className="brand-logo" /></button>
        <nav aria-label="Primary navigation">{mainViews.map((item) => <button type="button" key={item.id} className="nav-link" aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
        <div className="topbar-actions">
          <a className="nav-link" href={BUSINESS_PORTAL_PATH}>For businesses</a>
          <button type="button" className="nav-link" onClick={() => setView("plan")}>Plan an event</button>
          <a className="create-action" href="#/create">Create event</a>
        </div>
      </header>
      <ProfileApiSync />
      <main>
        {notice && <p className="integration-notice" role="status">{notice}</p>}
        {endorsementEvent ? <EndorsementScreen event={endorsementEvent} onDone={() => setEndorsementEventId(undefined)} />
          : view === "for-you" ? <><section className="hero"><p className="eyebrow">Your city, your people</p><h1>Find something good to do nearby.</h1><p>Recommendations use your interests and travel radius.</p></section><DiscoverEvents store={store} preferences={preferences} /></>
          : view === "map" || discoveryRoutes.includes(view as DiscoveryRoute) ? <DiscoverEvents store={store} preferences={preferences} />
          : view === "my-events" ? <MyEventsView events={events} pastAreSample onOpenChat={openEvent} onOpenEvent={openEvent} onEndorse={setEndorsementEventId} onFindEvents={() => setView("for-you")} />
          : view === "profile" ? <ProfileView />
          : <EventPlanner onBack={() => setView("for-you")} />}
      </main>
    </div>
  );
}
