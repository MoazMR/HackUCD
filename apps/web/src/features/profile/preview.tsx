/**
 * Development-only harness for Sarah's screens, so they can be run and tested
 * without editing the shared App.tsx. Open with `npm run dev`:
 *   http://localhost:5173/src/features/profile/preview.html
 * It is not part of the production build. See README.md in this folder for
 * how to mount these views in the real app shell.
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/global.css";
import { Onboarding } from "../auth";
import { Logo } from "./Logo";
import { EndorsementScreen, MyEventsView, ProfileProvider, ProfileView, sampleMyEvents, useProfile } from "./index";

function useHash(): [string, (next: string) => void] {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || "/profile");
  useEffect(() => {
    const onChange = () => { setHash(window.location.hash.slice(1) || "/profile"); window.scrollTo(0, 0); };
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return [hash, (next) => { window.location.hash = next; }];
}

function Preview() {
  const { profile, reset } = useProfile();
  const [route, go] = useHash();
  const events = sampleMyEvents();

  let screen;
  const endorse = route.match(/^\/my-events\/([^/]+)\/endorse$/);
  const stub = route.match(/^\/events\/([^/]+)(\/chat)?$/);
  if (!profile.onboarded) {
    screen = <Onboarding onComplete={() => go("/profile")} />;
  } else if (endorse) {
    const event = events.find((item) => item.id === endorse[1]);
    screen = event ? <EndorsementScreen event={event} onDone={() => go("/my-events")} /> : <p role="alert">That event wasn't found.</p>;
  } else if (stub) {
    const event = events.find((item) => item.id === stub[1]);
    screen = (
      <section className="pf">
        <div className="pf-panel pf-panel-narrow">
          <h1 className="pf-title">{stub[2] ? "Public group chat" : "Event details"}</h1>
          <p>{event?.title}. This screen belongs to the events feature (Kate). My Events hands over the event id <code>{stub[1]}</code>.</p>
          <button type="button" className="pf-button" onClick={() => go("/my-events")}>Back to My Events</button>
        </div>
      </section>
    );
  } else if (route === "/my-events") {
    screen = <MyEventsView onOpenChat={(id) => go(`/events/${id}/chat`)} onOpenEvent={(id) => go(`/events/${id}`)}
      onEndorse={(id) => go(`/my-events/${id}/endorse`)} onFindEvents={() => go("/profile")} />;
  } else {
    screen = <ProfileView />;
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand pf-brand-link" href="#/profile"><Logo /></a>
        {profile.onboarded && <nav aria-label="Preview navigation">
          <a href="#/my-events" aria-current={route.startsWith("/my-events") ? "page" : undefined}>My Events</a>
          <a href="#/profile" aria-current={route === "/profile" ? "page" : undefined}>Profile</a>
          <a href="#/profile" onClick={() => reset()}>Restart onboarding</a>
        </nav>}
      </header>
      {screen}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><ProfileProvider><Preview /></ProfileProvider></StrictMode>
);
