import { useEffect, useMemo, useState } from "react";
import { Onboarding } from "./features/auth/Onboarding";
import { DiscoverEvents } from "./features/discovery/DiscoverEvents";
import { EventPlanner } from "./features/planning/EventPlanner";
import { EndorsementScreen, MyEventsView, ProfileProvider, ProfileView, sampleMyEvents, useProfile } from "./features/profile";
import { ProfileApiSync } from "./integration/ProfileApiSync";

type MainView = "for-you" | "map" | "my-events" | "profile";
type View = MainView | "plan";
const mainViews: Array<{ id: MainView; label: string }> = [
  { id: "for-you", label: "For You" }, { id: "map", label: "Map" },
  { id: "my-events", label: "My Events" }, { id: "profile", label: "Profile" }
];

function viewFromHash(): View {
  const value = window.location.hash.slice(1) as View;
  return [...mainViews.map((item) => item.id), "plan"].includes(value) ? value : "for-you";
}

export function App() {
  return <ProfileProvider><AppContent /></ProfileProvider>;
}

function AppContent() {
  const { profile } = useProfile();
  const [view, setViewState] = useState<View>(viewFromHash);
  const [endorsementEventId, setEndorsementEventId] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const events = useMemo(() => sampleMyEvents(), []);

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
        <button className="brand" type="button" onClick={() => setView("for-you")}>ThirdPlace</button>
        <nav aria-label="Primary navigation">{mainViews.map((item) => <button type="button" key={item.id} className="nav-link" aria-current={view === item.id ? "page" : undefined} onClick={() => setView(item.id)}>{item.label}</button>)}</nav>
        <button type="button" className="create-action" onClick={() => setView("plan")}>Plan an event</button>
      </header>
      <ProfileApiSync />
      <main>
        {notice && <p className="integration-notice" role="status">{notice}</p>}
        {endorsementEvent ? <EndorsementScreen event={endorsementEvent} onDone={() => setEndorsementEventId(undefined)} />
          : view === "for-you" ? <><section className="hero"><p className="eyebrow">Your city, your people</p><h1>Find something good to do nearby.</h1><p>Recommendations use your interests and travel radius.</p></section><DiscoverEvents /></>
          : view === "map" ? <section className="integration-placeholder" aria-labelledby="map-heading"><p className="eyebrow">Map</p><h1 id="map-heading">Nearby event map</h1><p>Kate's interactive hotspots will mount in this shared navigation slot. The accessible event list remains available below.</p><DiscoverEvents /></section>
          : view === "my-events" ? <MyEventsView events={events} onOpenChat={() => setNotice("Public event-group chat opens from Kate's event detail flow once it is merged.")} onOpenEvent={() => setNotice("Event details open here once Kate's event flow is merged.")} onEndorse={setEndorsementEventId} onFindEvents={() => setView("for-you")} />
          : view === "profile" ? <ProfileView />
          : <EventPlanner onBack={() => setView("for-you")} />}
      </main>
    </div>
  );
}
